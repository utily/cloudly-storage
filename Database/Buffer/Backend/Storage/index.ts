import * as isoly from "isoly"
import * as platform from "@cloudflare/workers-types"
import { Document } from "../../../Document"
import { Identifier } from "../../../Identifier"
import { Status } from "../../Status"
import { error } from "../error"
import { Portion } from "./Portion"

export class Storage {
	private constructor(
		private readonly state: platform.DurableObjectState,
		private readonly portion: Portion,
		public readonly changedPrecision: "seconds" | "minutes" | "hours"
	) {}

	private changedKey(document: Record<string, any>): string {
		return "changed/" + document.changed + "/" + document.id
	}
	async status(options: Status.Options): Promise<Status | Record<string, unknown> | Error> {
		let result: Status | Record<string, unknown>
		const idKey: string | undefined = !options.list
			? await this.state.storage.get<string>(`id/${options.id}`)
			: undefined
		const document: (Record<string, any> & Document) | undefined = idKey
			? await this.state.storage.get(idKey)
			: undefined
		if (options.dump) {
			result = Object.fromEntries((await this.state.storage.list()).entries())
		} else
			result = {
				lastArchived: options.lastArchived ? await this.state.storage.get("lastArchived") : undefined,
				index: {
					id: !options.index?.includes("id")
						? undefined
						: options.list
						? Array.from((await this.state.storage.list<string>({ prefix: "id/" })).entries())
						: [`id/${options.id}`, idKey ?? "undefined"],
					changed: !options.index?.includes("changed")
						? undefined
						: options.list
						? Array.from((await this.state.storage.list<string>({ prefix: "changed/" })).entries())
						: document
						? [
								this.changedKey(document),
								(await this.state.storage.get<string>(this.changedKey(document))) ?? "undefined",
						  ]
						: ["undefined", "undefined"],
				},
				doc: document,
			}

		return result
	}

	async load<T extends Document & Record<string, any>>(id: string[], lock?: isoly.DateTime): Promise<T[]>
	async load<T extends Document & Record<string, any>>(
		id?: string | string[] | { prefix?: string[]; limit?: number },
		lock?: isoly.DateTime
	): Promise<T | T[] | undefined>
	async load<T extends Document & Record<string, any>>(
		id?: string | string[] | { prefix?: string[]; limit?: number },
		lock?: isoly.DateTime
	): Promise<T | T[] | Error> {
		let result: T | T[] | Error
		if (typeof id == "string") {
			id = await this.locked(id, lock)
			if (id == "locked")
				result = error("load", "document is locked")
			else {
				const key = await this.state.storage.get<string>("id/" + id)
				result = key
					? (await this.state.storage.get<T>(key)) ?? error("load", "document not found")
					: error("load", "key for document not found")
			}
		} else if (Array.isArray(id)) {
			id = await this.locked(id, lock)
			const listed = Object.fromEntries((await this.portion.get<T>(id)).entries())
			result = Object.values(listed)
		} else {
			const limit = id?.limit
			result = (
				await Promise.all(
					(id && Array.isArray(id.prefix) ? id.prefix : [undefined])?.map(p =>
						this.state.storage.list<T>({ prefix: p, limit }).then(r => Array.from(r.values()))
					)
				)
			).flat()
		}
		return result
	}
	async storeDocuments<T extends { id: string } & Record<string, any>>(
		documents: Record<string, T>,
		index?: string,
		unlock?: true
	): Promise<T | T[]> {
		const oldIdIndices = Object.fromEntries(
			(await this.portion.get<string>(Object.values(documents).map(document => "id/" + document.id))).entries()
		)
		const { newDocuments, idIndices, indices } = Object.entries(documents).reduce(
			(
				r: { newDocuments: Record<string, T>; idIndices: Record<string, string>; indices: Record<string, string> },
				[key, document]
			) => ({
				indices: { ...r.indices, [index + "/" + isoly.DateTime.now() + "/" + Identifier.generate(4)]: key },
				newDocuments: { ...r.newDocuments, [oldIdIndices["id/" + document.id] ?? key]: document },
				idIndices: { ...r.idIndices, ["id/" + document.id]: key },
			}),
			{ newDocuments: {}, idIndices: {}, indices: {} }
		)
		const changedIndex = await this.updateChangedIndex(newDocuments, unlock)
		await this.portion.put({
			...indices,
			...newDocuments,
			...idIndices,
			...changedIndex,
		})
		const result = Object.values(documents)
		return result.length == 1 ? result[0] : result
	}

	async changeDocuments<T extends Document & Record<string, any>>(
		changes: [T & Partial<Document> & Pick<Document, "id">, T & Document][],
		type: "update" | "append",
		prefix: string,
		index?: string,
		unlock?: true
	): Promise<((T & Document) | Error)[]> {
		return await Promise.all(
			changes.map(([amendment, archived]) => this.changeDocument(amendment, type, prefix, index, archived, unlock))
		)
	}
	async changeDocument<T extends Document & Record<string, any>>(
		amendment: T & Partial<Document> & Pick<Document, "id">,
		type: "update" | "append",
		prefix: string,
		index?: string,
		archived?: T & Document,
		unlock?: true
	): Promise<(T & Document) | Error> {
		const key = await this.state.storage.get<string>("id/" + amendment.id)
		const temp = key ? await this.state.storage.get<T>(key) : undefined
		const old = temp ?? archived
		let response
		let updated
		if (!amendment.applyTo || old?.changed == amendment.applyTo || !old) {
			delete amendment.applyTo
			updated = Document[type]<T>(old ?? ({} as any as T), {
				...amendment,
				changed:
					amendment.changed == old?.changed ? isoly.DateTime.nextMillisecond(amendment.changed) : amendment.changed,
			})
			response = updated
				? await this.storeDocuments({ [key ?? `${prefix}${updated.created}/${updated.id}`]: updated }, index, unlock)
				: undefined
		}
		return response && updated
			? updated
			: error(
					type,
					`failed to ${type} the document due to ${!updated ? "updated" : "response"} is undefined.`,
					amendment.id
			  )
	}
	async updateChangedIndex(documents: Record<string, any>, unlock?: true): Promise<Record<string, string>> {
		const ids = Object.keys(documents)
		const oldDocuments = Array.from((await this.portion.get<Record<string, any>>(ids)).values())
		await this.portion.remove([
			...oldDocuments.map(document => this.changedKey(document)),
			...(unlock ? oldDocuments.map(document => "lock/" + document.id) : []),
		])
		return Object.entries(documents).reduce((r, [key, document]) => ({ ...r, [this.changedKey(document)]: key }), {})
	}

	async removeDocuments(ids: string | string[]): Promise<boolean | boolean[]> {
		let result: boolean | boolean[] = false
		if (typeof ids == "string") {
			const idKey = "id/" + ids
			const lockKey = "lock/" + ids
			const key = await this.state.storage.get<string>(idKey)
			const document = key ? await this.state.storage.get<Record<string, any>>(key) : undefined
			const changed = document && this.changedKey(document)
			result = !!key && !!changed && (await this.state.storage.delete([key, idKey, changed, lockKey])) == 4
		} else {
			const idKey = ids.map(e => "id/" + e)
			const lockKey = ids.map(e => "lock/" + e)
			const key = Array.from((await this.portion.get<string>(idKey)).values())
			const documents = Array.from((await this.portion.get<Record<string, any>>(key)).entries())
			const changed = documents.map(document => this.changedKey(document))
			const deleted = await this.portion.remove([...key, ...idKey, ...changed, ...lockKey])
			result = deleted.slice(0)
		}
		return result
	}

	async remove(keys: string | string[]): Promise<boolean | boolean[]> {
		let result: boolean | boolean[]
		if (typeof keys == "string")
			result = !!keys && (await this.state.storage.delete(keys))
		else
			result = await this.portion.remove(keys)
		return result
	}

	private async locked(id: string, lock?: isoly.DateTime): Promise<string>
	private async locked(id: string[], lock?: isoly.DateTime): Promise<string[]>
	private async locked(id: string | string[], lock?: isoly.DateTime): Promise<string | string[]> {
		return !isoly.DateTime.is(lock)
			? id
			: typeof id == "string"
			? await this.state.blockConcurrencyWhile(async () => {
					const locked = await this.state.storage.get<string>("lock/" + id)
					const result = !locked || locked < isoly.DateTime.now() ? id : "locked"
					result != "locked" && (await this.state.storage.put("lock/" + id, lock))
					return result
			  })
			: Array.isArray(id)
			? await this.state.blockConcurrencyWhile(async () => {
					const ids = id as string[]
					const locks = Object.fromEntries((await this.portion.get<string>(ids.map(i => "lock/" + i))).entries())
					id = ids.filter(i => (locks["lock/" + i] ?? "") < isoly.DateTime.now())
					await this.portion.put(
						id.reduce(
							(r, k) => ({
								...r,
								["lock/" + k]: lock,
							}),
							{}
						)
					)
					return id
			  })
			: id
	}

	static open(state: platform.DurableObjectState, changedPrecision?: "seconds" | "minutes" | "hours"): Storage
	static open(
		state: platform.DurableObjectState | undefined,
		changedPrecision?: "seconds" | "minutes" | "hours"
	): Storage | undefined
	static open(
		state: platform.DurableObjectState | undefined,
		changedPrecision?: "seconds" | "minutes" | "hours"
	): Storage | undefined {
		return state ? new Storage(state, Portion.open(state.storage), changedPrecision ?? "seconds") : undefined
	}
}
