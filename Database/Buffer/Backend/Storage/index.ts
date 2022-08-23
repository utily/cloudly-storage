import * as isoly from "isoly"
import * as platform from "../../../../platform"
import { Portion } from "./Portion"

export class Storage {
	private constructor(private readonly storage: platform.DurableObjectState["storage"]) {}

	async load<T>(): Promise<T | undefined>
	async load<T>(id: string): Promise<T | undefined>
	async load<T>(id: string[]): Promise<T[] | undefined>
	async load<T>(prefix: { prefix: string }): Promise<T[] | undefined>
	async load<T>(id?: string | string[] | { prefix: string }): Promise<T | T[] | undefined>
	async load<T>(id?: string | string[] | { prefix: string }): Promise<T | T[] | undefined> {
		let result: T | T[] | undefined
		if (typeof id == "string") {
			const key = await this.storage.get<string>("id/" + id)
			result = key ? await this.storage.get<T>(key) : undefined
		} else if (Array.isArray(id))
			result = await Portion.get<T>(id, this.storage)
		else if (typeof id == "object" || !id)
			result = Array.from((await this.storage.list<T>(id)).values())
		return result
	}
	async storeDocument<T extends { id: string } & Record<string, any>>(key: string, document: T): Promise<void> {
		const idIndexKey = "id/" + document.id
		await this.removeChanged(key, idIndexKey) //remove old changed index
		const changedKey = `changed/${isoly.DateTime.truncate(document.changed, "seconds")}`
		const changedIndex = await this.storage.get<string>(changedKey)
		return await this.storage.put({
			[key]: document, //doc
			[changedKey]: (changedIndex ? changedIndex + "\n" : "") + key, // changed index
			[idIndexKey]: key, //id index
		})
	}
	async removeChanged(key: string, idIndexKey: string): Promise<void> {
		const oldDoc = await this.storage
			.get<string>(idIndexKey)
			.then(async r => (r ? await this.storage.get<Record<string, any>>(r) : undefined))
		const oldChangedIndex = oldDoc ? "changed/" + isoly.DateTime.truncate(oldDoc.changed, "minutes") : undefined
		oldChangedIndex &&
			(await this.storage
				.get<string>(oldChangedIndex)
				.then(async r => (r ? await this.storage.put(oldChangedIndex, r.replace(key + "\n", "")) : undefined)))
	}

	async remove(keys: string[]): Promise<number> {
		return Portion.remove(keys, this.storage)
	}

	static open(state: platform.DurableObjectState): Storage
	static open(state: platform.DurableObjectState | undefined): Storage | undefined
	static open(state: platform.DurableObjectState | undefined): Storage | undefined {
		return state ? new Storage(state.storage) : undefined
	}
}
