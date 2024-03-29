import { isoly } from "isoly"
import * as platform from "@cloudflare/workers-types"
import { Storage as StorageStorage } from "../../../../DurableObject"
import { Document } from "../../../Document"
import { Identifier } from "../../../Identifier"
import { Item } from "../../../Item"
import { Status } from "../../Status"
import { error } from "../error"

export class Storage {
	private constructor(
		private readonly state: platform.DurableObjectState,
		public readonly storage: StorageStorage,
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
		id: string | string[] | { prefix: string[]; limit?: number },
		lock?: isoly.DateTime
	): Promise<T | T[] | undefined>
	async load<T extends Document & Record<string, any>>(
		selection: string | string[] | { prefix: string[]; limit?: number },
		lock?: isoly.DateTime
	): Promise<T | T[] | Error> {
		let result: T | T[] | Error
		if (typeof selection == "string") {
			selection = await this.locked(selection, lock)
			if (selection == "locked")
				result = error("load", "document is locked")
			else {
				const key = await this.state.storage.get<string>("id/" + selection)
				result = key
					? (await this.state.storage.get<T>(key)) ?? error("load", "document not found")
					: error("load", "key for document not found")
			}
		} else if (Array.isArray(selection)) {
			selection = await this.locked(selection, lock)
			const listed = Object.fromEntries((await this.storage.get<T>(selection)).entries())
			result = Object.values(listed)
		} else {
			const limit = selection.limit
			const listed: string[] | T[] = (
				await Promise.all(
					selection.prefix.map(p => this.state.storage.list({ prefix: p, limit }).then(r => Array.from(r.values())))
				)
			).flat() as string[] | T[]
			if (typeof listed[0] != "string")
				result = listed as T[]
			else
				result = Array.from((await this.storage.get<T>(listed as string[])).values())
		}
		return result
	}
	async storeDocuments<T extends Item<Document>>(
		items: Record<string, T>,
		index?: string,
		unlock?: true
	): Promise<(Document & Record<string, any>) | (Document & Record<string, any>)[]> {
		const oldIdIndices = Object.fromEntries(
			(await this.storage.get<string>(Object.values(items).map(document => "id/" + document.meta.id))).entries()
		)
		const now = isoly.DateTime.now()
		const { newDocuments, idIndices, indices } = Object.entries(items).reduce(
			(
				r: { newDocuments: Record<string, T>; idIndices: Record<string, string>; indices: Record<string, string> },
				[key, item]
			) => ({
				indices: index ? { ...r.indices, [index + "/" + now + "/" + Identifier.generate(4)]: key } : r.indices,
				newDocuments: {
					...r.newDocuments,
					[oldIdIndices["id/" + item.meta.id] ?? key]: { meta: { ...item.meta, changed: now }, value: item.value },
				},
				idIndices: { ...r.idIndices, ["id/" + item.meta.id]: key },
			}),
			{ newDocuments: {}, idIndices: {}, indices: {} }
		)
		const changedIndex = await this.updateChangedIndex(newDocuments, unlock)
		await this.storage.put({
			...indices,
			...newDocuments,
			...idIndices,
			...changedIndex,
		})
		const result = Object.values(newDocuments).map(d => ({ ...d.meta, ...d.value }))
		return result.length == 1 ? result[0] : result
	}

	async update<T extends Item<Document, Record<string, any>>>(
		updates: T[],
		prefix: string,
		index?: string,
		unlock?: true
	): Promise<(Document & Record<string, any>) | (Document & Record<string, any>)[] | Error> {
		const keys = await this.state.storage.get<string>(updates.map(c => "id/" + c.meta.id))
		const oldDocuments = keys ? await this.state.storage.get<T>(Array.from(keys.values())) : undefined
		let toBeStored: Record<string, Item<Document>> = {}
		for (const { meta, value } of updates) {
			const old = oldDocuments?.get(keys.get("id/" + meta.id) ?? "")
			if (!meta.changed || old?.meta.changed == meta.changed || !old)
				toBeStored = {
					...toBeStored,
					[`${prefix}${meta.created}/${meta.id}`]: { meta, value },
				}
		}
		const response = await this.storeDocuments(toBeStored, index, unlock)
		return (
			response ??
			error("update", `failed to update the document.`, updates.length == 1 ? updates[0].meta.id : undefined)
		)
	}
	async updateChangedIndex(documents: Record<string, Item<Document>>, unlock?: true): Promise<Record<string, string>> {
		const ids = Object.keys(documents)
		const oldDocuments = Array.from((await this.storage.get<Item<Document>>(ids)).values())
		await this.storage.remove([
			...oldDocuments.map(document => this.changedKey(document.meta)),
			...(unlock ? oldDocuments.map(document => "lock/" + document.meta.id) : []),
		])
		return Object.entries(documents).reduce(
			(r, [key, document]) => ({ ...r, [this.changedKey(document.meta)]: key }),
			{}
		)
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
			const key = Array.from((await this.storage.get<string>(idKey)).values())
			const documents = Array.from((await this.storage.get<Record<string, any>>(key)).entries())
			const changed = documents.map(document => this.changedKey(document))
			const deleted = await this.storage.remove([...key, ...idKey, ...changed, ...lockKey])
			result = deleted.slice(0)
		}
		return result
	}

	async remove(keys: string | string[]): Promise<boolean | boolean[]> {
		let result: boolean | boolean[]
		if (typeof keys == "string")
			result = !!keys && (await this.state.storage.delete(keys))
		else
			result = await this.storage.remove(keys)
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
					const locks = Object.fromEntries((await this.storage.get<string>(ids.map(i => "lock/" + i))).entries())
					id = ids.filter(i => (locks["lock/" + i] ?? "") < isoly.DateTime.now())
					await this.storage.put(
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
		return state ? new Storage(state, StorageStorage.open(state.storage), changedPrecision ?? "seconds") : undefined
	}
}
