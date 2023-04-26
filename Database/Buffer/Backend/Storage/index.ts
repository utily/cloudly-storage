import * as isoly from "isoly"
import * as platform from "@cloudflare/workers-types"
import { Document } from "../../../Document"
import { Identifier } from "../../../Identifier"
import { error } from "../error"
import { Portion } from "./Portion"

export class Storage {
	private constructor(
		private readonly state: platform.DurableObjectState,
		public readonly portion: Portion,
		public readonly changedPrecision: "seconds" | "minutes" | "hours"
	) {}

	private changedKey(document: Record<string, any>): string {
		return "changed/" + document.changed + "/" + document.id
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
	async storeDocuments<
		T extends [Document & Record<string, any>, Record<string, any>] | (Document & Record<string, any>)
	>(
		documents: Record<string, T>,
		index?: string,
		unlock?: true
	): Promise<(Document & Record<string, any>) | (Document & Record<string, any>)[]> {
		const oldIdIndices = Object.fromEntries(
			(
				await this.portion.get<string>(
					Object.values(documents).map(document => "id/" + (Array.isArray(document) ? document[0].id : document.id))
				)
			).entries()
		)
		const { newDocuments, idIndices, indices } = Object.entries(documents).reduce<{
			newDocuments: Record<string, T>
			idIndices: Record<string, string>
			indices?: Record<string, string>
		}>(
			(r, [key, document]) => ({
				indices: index
					? { ...r.indices, [index + "/" + isoly.DateTime.now() + "/" + Identifier.generate(4)]: key }
					: undefined,
				newDocuments: { ...r.newDocuments, [oldIdIndices["id/" + document[0].id] ?? key]: document },
				idIndices: { ...r.idIndices, ["id/" + document[0].id]: key },
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
		const result = Object.values(documents).map(d => ({ ...d[0], ...d[1] }))
		return result.length == 1 ? result[0] : result
	}

	async changeDocuments<
		T extends [Partial<Document> & Pick<Document, "id"> & Record<string, any>, Record<string, any>]
	>(
		updates: T[],
		prefix: string,
		index?: string,
		unlock?: true
	): Promise<(Document & Record<string, any>) | (Document & Record<string, any>)[] | Error> {
		const keys = await this.state.storage.get<string>(updates.map(c => "id/" + c[0].id))
		const oldDocuments = keys ? await this.state.storage.get<T>(Array.from(keys.values())) : undefined
		const now = isoly.DateTime.now()
		let response
		let toBeStored: Record<string, [Document & Record<string, any>, Record<string, any>]> = {}
		for (const update of updates) {
			const old = oldDocuments?.get(keys.get("id/" + update[0].id) ?? "")
			if (!update[0].applyTo || old?.[0]?.changed == update?.[1].applyTo || !old) {
				delete update[1].applyTo
				const created = old?.[0]?.created ?? update[0].created ?? now
				toBeStored = {
					...toBeStored,
					[`${prefix}${created}/${update[0].id}`]: [
						{
							...update[0],
							created,
							changed:
								(update[0].changed && update[0].changed == old?.[0]?.changed
									? isoly.DateTime.nextMillisecond(update[0].changed)
									: update[0].changed) ?? now,
						},
						update[1],
					],
				}
			}
			response = await this.storeDocuments(toBeStored, index, unlock)
		}
		return (
			response ?? error("update", `failed to update the document.`, updates.length == 1 ? updates[0][0].id : undefined)
		)
	}
	async updateChangedIndex(documents: Record<string, any>, unlock?: true): Promise<Record<string, string>> {
		const ids = Object.keys(documents)
		const oldDocuments = Array.from((await this.portion.get<Record<string, any>>(ids)).values())
		await this.portion.remove([
			...oldDocuments.map(document => this.changedKey(document[0])),
			...(unlock ? oldDocuments.map(document => "lock/" + document[0].id) : []),
		])
		return Object.entries(documents).reduce((r, [key, document]) => ({ ...r, [this.changedKey(document[0])]: key }), {})
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
