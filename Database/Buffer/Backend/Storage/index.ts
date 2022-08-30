import * as isoly from "isoly"
import * as platform from "../../../../platform"
import { Document } from "../../../Document"
import { Portion } from "./Portion"
export class Storage {
	private constructor(
		private readonly storage: platform.DurableObjectState["storage"],
		private readonly portion: Portion
	) {}

	async load<T>(): Promise<T | undefined>
	async load<T>(id: string): Promise<T | undefined>
	async load<T>(id: string[]): Promise<T[] | undefined>
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
					(id && Array.isArray(id.prefix) ? id.prefix : [""])?.map(p =>
						this.storage.list<T>({ prefix: "doc/" + p, limit: id?.limit }).then(r => Array.from(r.values()))
					)
				)
			).flat()
		}
		return result
	}
	async storeDocuments<T extends { id: string } & Record<string, any>>(
		documents: Record<string, T>
	): Promise<Record<string, any>> {
		const suggestedIdIndices: Record<string, string> = Object.entries(documents).reduce(
			(r, [key, document]) => ({ ...r, ["id/" + document.id]: key }),
			{}
		)
		const oldIdIndices = Object.fromEntries((await this.portion.get<string>(Object.keys(suggestedIdIndices))).entries())
		const newDocuments = Object.entries(documents).reduce(
			(r: Record<string, T>, [key, document]) => ({ ...r, [oldIdIndices["id/" + document.id] ?? key]: document }),
			{}
		)
		const changedIndex = await this.updateChangedIndex(newDocuments)
		await this.portion.put({
			...newDocuments,
			...suggestedIdIndices,
			...oldIdIndices,
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
		const oldDocuments = {
			...documents,
			...Object.fromEntries((await this.portion.get<Record<string, any>>(Object.keys(documents))).entries()),
		}
		const toBeRemoved = this.toChanged(oldDocuments)
		const oldChanged = await this.portion.get<string>(Object.keys(toBeRemoved))
		const oldCleanedChanged = await Promise.resolve(oldChanged).then(response =>
			Array.from(response.entries()).reduce(
				(r: Record<string, string>, [changedIndexKey, oldValue]) => ({
					...r,
					[changedIndexKey]: oldValue.replace(new RegExp(toBeRemoved[changedIndexKey].join("\n?|") + "\n?", "g"), ""),
				}),
				{}
			)
		)
		const updated = Object.entries(documents).reduce((r: Record<string, string>, [key, document]) => {
			const indexKey = "changed/" + isoly.DateTime.truncate(document.changed, "seconds")
			return { ...r, [indexKey]: (r[indexKey] ? r[indexKey] + "\n" : "") + key }
		}, oldCleanedChanged)
		return updated
	}

	private toChanged(documents: { [k: string]: Record<string, any> }): Record<string, string[]> {
		return Object.entries(documents).reduce((r: Record<string, string[]>, [key, document]) => {
			const indexKey = "changed/" + isoly.DateTime.truncate(document.changed, "seconds")
			return { ...r, [indexKey]: [...(r[indexKey] ?? []), key] }
		}, {})
	}

	async removeDocuments(keys: string | string[]): Promise<boolean | boolean[]> {
		let result: boolean | boolean[] = false
		if (typeof keys == "string") {
			const idKey = "id/" + keys
			const key = await this.storage.get<string>(idKey)
			const document = key ? await this.storage.get<Record<string, any>>(key) : undefined
			document && key && (await this.removeChanged(document.changed, key))
			result = !!key && (await this.storage.delete([key, idKey])) == 2
		} else {
			const idKey = keys.map(e => "id/" + e)
			const key = Array.from((await this.portion.get<string>(idKey)).values())
			const document = Array.from((await this.portion.get<Record<string, any>>(key)).entries())
			const changedToRemove = document.reduce((r: Record<string, string[]>, [key, document]) => {
				const changedKey = "changed/" + isoly.DateTime.truncate(document?.changed, "seconds")
				return { [changedKey]: (r[changedKey] ?? []).concat(key + "(\n)?") }
			}, {})
			const a: [string, string][] = Array.from((await this.portion.get<string>(Object.keys(changedToRemove))).entries())
			const changedValue = a.reduce(
				(r: Record<string, string>, [changedKey, changedValue]) => ({
					...r,
					[changedKey]: changedValue.replace(new RegExp(changedToRemove[changedKey].join("|") + "(\n)?"), ""),
				}),
				{}
			)
			await this.portion.put(changedValue)
			const deleted = await this.portion.remove([...key, ...idKey])
			result = deleted.reduce(
				(r: boolean[], d: boolean, i) =>
					(i + 1) % 2 === 0 ? [...r.slice(0, r.length - 1), r[r.length - 1] && d] : [...r, d],
				[]
			)
		}
		return result
	}
	private async removeChanged(oldChangedDate: isoly.DateTime, key: string) {
		const changedKey = "changed/" + oldChangedDate && isoly.DateTime.truncate(oldChangedDate, "seconds")
		const changedValue = oldChangedDate ? await this.storage.get<string>(changedKey) : undefined
		changedValue && (await this.storage.put(changedKey, changedValue.replace(new RegExp(key + "(\n)?"), "")))
	}
	async remove(keys: string | string[]): Promise<boolean | boolean[]> {
		let result: boolean | boolean[]
		if (typeof keys == "string")
			result = !!keys && (await this.storage.delete(keys))
		else
			result = await this.portion.remove(keys)
		return result
	}

	static open(state: platform.DurableObjectState): Storage
	static open(state: platform.DurableObjectState | undefined): Storage | undefined
	static open(state: platform.DurableObjectState | undefined): Storage | undefined {
		return state ? new Storage(state.storage, Portion.open(state.storage)) : undefined
	}
}
