import * as isoly from "isoly"
import * as platform from "../../../../platform"
import { Portion } from "./Portion"

export class Storage {
	private constructor(private readonly storage: platform.DurableObjectState["storage"]) {}

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
			result = Array.from((await Portion.get<T>(id, this.storage)).values())
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
		const oldIdIndices = Object.fromEntries(
			(await Portion.get<string>(Object.keys(suggestedIdIndices), this.storage)).entries()
		)
		const newdocuments = Object.entries(documents).reduce(
			(r: Record<string, T>, [key, document]) => ({ ...r, [oldIdIndices["id/" + document.id] ?? key]: document }),
			{}
		)
		const changedIndex = await this.updateChangedIndex(newdocuments)
		return await Portion.put(
			{
				...newdocuments,
				...suggestedIdIndices,
				...oldIdIndices,
				...changedIndex,
			},
			this.storage
		)
	}
	async updateChangedIndex(documents: Record<string, any>): Promise<Record<string, string>> {
		const oldDocuments = {
			...documents,
			...Object.fromEntries((await Portion.get<Record<string, any>>(Object.keys(documents), this.storage)).entries()),
		}
		const toBeRemoved = this.toChanged(oldDocuments)
		const oldChanged = await Portion.get<string>(Object.keys(toBeRemoved), this.storage)
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
			const indexKey = "changed/" + isoly.DateTime.truncate(document.changed, "minutes")
			return { ...r, [indexKey]: (r[indexKey] ? r[indexKey] + "\n" : "") + key }
		}, oldCleanedChanged)
		return updated
	}

	private toChanged(documents: { [k: string]: Record<string, any> }): Record<string, string[]> {
		return Object.entries(documents).reduce((r: Record<string, string[]>, [key, document]) => {
			const indexKey = "changed/" + isoly.DateTime.truncate(document.changed, "minutes")
			return { ...r, [indexKey]: [...(r[indexKey] ?? []), key] }
		}, {})
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
