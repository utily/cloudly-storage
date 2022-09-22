import * as isoly from "isoly"
import * as platform from "../../../../platform"
import { Document } from "../../../Document"
import { Key } from "../../../Key"
import { Portion } from "./Portion"

export class Storage {
	private constructor(
		private readonly storage: platform.DurableObjectState["storage"],
		private readonly portion: Portion,
		public readonly changedPrecision: "seconds" | "minutes" | "hours"
	) {}

	private changedKey(document: Record<string, any>): string {
		return "changed/" + document.changed + "/" + document.id
	}

	async load<T extends Document & Record<string, any>>(): Promise<T | undefined>
	async load<T extends Document & Record<string, any>>(id: string, lock?: isoly.TimeSpan): Promise<T | undefined>
	async load<T extends Document & Record<string, any>>(id: string[], lock?: isoly.TimeSpan): Promise<T[]>
	async load<T extends Document & Record<string, any>>(selection: {
		prefix?: string[]
		limit?: number
	}): Promise<T[] | undefined>
	async load<T extends Document & Record<string, any>>(
		id?: string | string[] | { prefix?: string[]; limit?: number },
		lock?: isoly.TimeSpan
	): Promise<T | T[] | undefined>
	async load<T extends Document & Record<string, any>>(
		id?: string | string[] | { prefix?: string[]; limit?: number },
		lock?: isoly.TimeSpan
	): Promise<T | T[] | undefined> {
		let result: T | T[] | undefined = undefined
		if (typeof id == "string") {
			const locked = lock ? await this.storage.get<string>("lock/" + id) : undefined
			if (!(locked && locked > isoly.DateTime.now())) {
				const key = await this.storage.get<string>("id/" + id)
				result = key ? await this.storage.get<T>(key) : undefined
				lock &&
					(await this.storage.put(
						"lock/" + id,
						isoly.DateTime.create(isoly.TimeSpan.toMilliseconds(lock) + Date.now())
					))
			}
		} else if (Array.isArray(id)) {
			if (lock) {
				const locks = Object.fromEntries((await this.portion.get<string>(id.map(i => "lock/" + id))).entries())
				id = id.filter(i => (locks["lock/" + i] ?? "") < isoly.DateTime.now())
			}
			const listed = Object.fromEntries((await this.portion.get<T>(id)).entries())
			lock &&
				(await this.portion.put<T>(
					Object.keys(listed).reduce(
						(r, k) => ({
							...r,
							["lock/" + Key.getLast(k)]: isoly.DateTime.create(isoly.TimeSpan.toMilliseconds(lock) + Date.now()),
						}),
						{}
					)
				))
			result = Object.values(listed)
		} else if (typeof id == "object" || !id) {
			const limit = id?.limit
			result = (
				await Promise.all(
					(id && Array.isArray(id.prefix) ? id.prefix : [undefined])?.map(p =>
						this.storage.list<T>({ prefix: p, limit }).then(r => Array.from(r.values()))
					)
				)
			).flat()
		}
		return result
	}
	async storeDocuments<T extends { id: string } & Record<string, any>>(
		documents: Record<string, T>,
		unlock?: true
	): Promise<T | T[]> {
		const oldIdIndices = Object.fromEntries(
			(await this.portion.get<string>(Object.values(documents).map(document => "id/" + document.id))).entries()
		)
		const { newDocuments, idIndices } = Object.entries(documents).reduce(
			(r: { newDocuments: Record<string, T>; idIndices: Record<string, string> }, [key, document]) => ({
				newDocuments: { ...r.newDocuments, [oldIdIndices["id/" + document.id] ?? key]: document },
				idIndices: { ...r.idIndices, ["id/" + document.id]: key },
			}),
			{ newDocuments: {}, idIndices: {} }
		)
		const changedIndex = await this.updateChangedIndex(newDocuments, unlock)
		await this.portion.put({
			...newDocuments,
			...idIndices,
			...changedIndex,
		})
		const result = Object.values(documents)
		return result.length == 1 ? result[0] : result
	}

	async changeDocuments<T extends Document & Record<string, any>>(
		amendments: Record<
			string,
			{
				amendment: T & Partial<Document> & Pick<Document, "id">
				archived?: T & Document
			}
		>,
		type: "update" | "append",
		unlock?: true
	): Promise<((T & Document) | undefined)[]> {
		let toBeStored: Record<string, T & Document> = {}
		for (const [id, { amendment, archived }] of Object.entries(amendments)) {
			const key = await this.storage.get<string>("id/" + id)
			const temp = key ? await this.storage.get<T>(key) : undefined
			const old: (T & Document) | undefined = temp ?? archived
			if (!amendment.applyTo || temp?.changed == amendment.applyTo) {
				const updated =
					old &&
					Document[type]<T & Document>(old, {
						...(({ applyTo, ...rest }): T => rest as T)(amendment),
						changed:
							amendment.changed == old.changed ? isoly.DateTime.nextMillisecond(amendment.changed) : amendment.changed,
					})
				toBeStored = key && updated ? { ...toBeStored, [key]: updated } : toBeStored
			}
		}
		const result = await this.storeDocuments(toBeStored, unlock)
		return Array.isArray(result) ? result : [result]
	}
	async changeDocument<T extends Document & Record<string, any>>(
		amendment: T & Partial<Document> & Pick<Document, "id">,
		type: "update" | "append",
		archived?: T & Document,
		unlock?: true
	): Promise<(T & Document) | undefined> {
		const key = await this.storage.get<string>("id/" + amendment.id)
		const temp = key ? await this.storage.get<T>(key) : undefined
		const old = temp ?? archived
		let response
		let updated
		if (!amendment.applyTo || temp?.changed == amendment.applyTo) {
			updated =
				old &&
				Document[type]<T>(old, {
					...(({ applyTo, ...rest }): T => rest as T)(amendment),
					changed:
						amendment.changed == old.changed ? isoly.DateTime.nextMillisecond(amendment.changed) : amendment.changed,
				})
			response = key && updated ? await this.storeDocuments({ [key]: updated }, unlock) : undefined
		}
		return response ? updated : undefined
	}
	async updateChangedIndex(documents: Record<string, any>, unlock?: true): Promise<Record<string, string>> {
		const ids = Object.keys(documents)
		const oldDocuments = Array.from((await this.portion.get<Record<string, any>>(ids)).values())
		await this.portion.remove([
			...oldDocuments.map(document => this.changedKey(document)),
			...(unlock ? ids.map(i => "lock/" + i) : []),
		])
		return Object.entries(documents).reduce((r, [key, document]) => ({ ...r, [this.changedKey(document)]: key }), {})
	}

	async removeDocuments(ids: string | string[]): Promise<boolean | boolean[]> {
		let result: boolean | boolean[] = false
		if (typeof ids == "string") {
			const idKey = "id/" + ids
			const lockKey = "lock/" + ids
			const key = await this.storage.get<string>(idKey)
			const document = key ? await this.storage.get<Record<string, any>>(key) : undefined
			const changed = document && this.changedKey(document)
			result = !!key && !!changed && (await this.storage.delete([key, idKey, changed, lockKey])) == 4
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
			result = !!keys && (await this.storage.delete(keys))
		else
			result = await this.portion.remove(keys)
		return result
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
		return state ? new Storage(state.storage, Portion.open(state.storage), changedPrecision ?? "seconds") : undefined
	}
}
