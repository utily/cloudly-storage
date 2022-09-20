import * as platform from "../../../../platform"
import { Document } from "../../../Document"
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

	async load<T>(): Promise<T | undefined>
	async load<T>(id: string): Promise<T | undefined>
	async load<T>(id: string[]): Promise<T[]>
	async load<T>(prefix: { prefix?: string[]; limit?: number }): Promise<T[] | undefined>
	async load<T>(id?: string | string[] | { prefix?: string[]; limit?: number }): Promise<T | T[] | undefined>
	async load<T>(id?: string | string[] | { prefix?: string[]; limit?: number }): Promise<T | T[] | undefined> {
		let result: T | T[] | undefined
		if (typeof id == "string") {
			const key = await this.storage.get<string>("id/" + id)
			result = key ? await this.storage.get<T>(key) : undefined
		} else if (Array.isArray(id))
			result = Array.from((await this.portion.get<T>(id)).values())
		else if (typeof id == "object" || !id) {
			result = (
				await Promise.all(
					(id && Array.isArray(id.prefix) ? id.prefix : [undefined])?.map(p =>
						this.storage.list<T>({ prefix: p, limit: id?.limit }).then(r => Array.from(r.values()))
					)
				)
			).flat()
		}
		return result
	}
	async storeDocuments<T extends { id: string } & Record<string, any>>(
		documents: Record<string, T>
	): Promise<Record<string, any>> {
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
		const changedIndex = await this.updateChangedIndex(newDocuments)
		await this.portion.put({
			...newDocuments,
			...idIndices,
			...changedIndex,
		})
		const result = Object.values(documents)
		return result.length == 1 ? result[0] : result
	}
	async updateDocument<T extends Document>(
		append: T & Partial<Document> & Pick<Document, "id">,
		archived?: T & Document
	): Promise<(T & Document) | undefined> {
		const key = await this.storage.get<string>("id/" + append.id)
		const old = key ? await this.storage.get<T>(key) : undefined
		const temp: (T & Document) | undefined = old ?? archived
		const updated = temp && Document.update<T & Document>(temp, append)
		const response = key && updated ? await this.storeDocuments({ [key]: updated }) : undefined
		return response ? updated : undefined
	}
	async appendDocument<T extends Document>(
		append: T & Partial<Document> & Pick<Document, "id">,
		archived?: T & Document
	): Promise<(T & Document) | undefined> {
		const key = await this.storage.get<string>("id/" + append.id)
		const old = key ? await this.storage.get<T>(key) : undefined
		const temp: (T & Document) | undefined = old ?? archived
		const updated = temp && Document.append<T & Document>(temp, append)
		const response = key && updated ? await this.storeDocuments({ [key]: updated }) : undefined
		return response ? updated : undefined
	}
	async updateChangedIndex(documents: Record<string, any>): Promise<Record<string, string>> {
		const oldDocuments = Array.from((await this.portion.get<Record<string, any>>(Object.keys(documents))).values())
		await this.portion.remove(oldDocuments.map(document => this.changedKey(document)))
		return Object.entries(documents).reduce((r, [key, document]) => ({ ...r, [this.changedKey(document)]: key }), {})
	}

	async removeDocuments(keys: string | string[]): Promise<boolean | boolean[]> {
		let result: boolean | boolean[] = false
		if (typeof keys == "string") {
			const idKey = "id/" + keys
			const key = await this.storage.get<string>(idKey)
			const document = key ? await this.storage.get<Record<string, any>>(key) : undefined
			const changed = document && this.changedKey(document)
			result = !!key && !!changed && (await this.storage.delete([key, idKey, changed])) == 3
		} else {
			const idKey = keys.map(e => "id/" + e)
			const key = Array.from((await this.portion.get<string>(idKey)).values())
			const documents = Array.from((await this.portion.get<Record<string, any>>(key)).entries())
			const changed = documents.map(document => this.changedKey(document))
			const deleted = await this.portion.remove([...key, ...idKey, ...changed])
			result = []
			const delta = deleted.length / 3
			for (let index = 0; index < delta; index++) {
				result.push(deleted[index] && deleted[delta + index] && deleted[2 * delta + index])
			}
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
