import * as platform from "../../../../platform"

export class Portion {
	private constructor(private readonly storage: platform.DurableObjectState["storage"]) {}

	async put<T = unknown>(data: Record<string, T>, keyLimit = 128): Promise<Record<string, T>> {
		let result: Record<string, T> = {}
		const promises: Promise<void>[] = []
		const tupleList = Object.entries(data)
		for (let i = 0; i < tupleList.length; i += keyLimit) {
			const segment = Object.fromEntries(tupleList.slice(i, i + keyLimit))
			promises.push(this.storage.put<T>(segment))
			result = { ...result, ...segment }
		}
		await Promise.all(promises)
		return result
	}
	async get<T = unknown>(data: string[], keyLimit = 128): Promise<Map<string, T>> {
		const promises: Promise<Map<string, T>>[] = []
		for (let i = 0; i < data.length; i += keyLimit) {
			const segment = data.slice(i, i + keyLimit)
			promises.push(this.storage.get<T>(segment))
		}
		return (await Promise.all(promises)).reduce((r: Map<string, T>, e) => new Map([...r, ...e]), new Map())
	}
	async remove(keys: string[], keyLimit = 128): Promise<number> {
		const promises: Promise<number>[] = []
		for (let i = 0; i < keys.length; i += keyLimit) {
			const segment = keys.slice(i, i + keyLimit)
			promises.push(this.storage.delete(segment))
		}
		return (await Promise.all(promises)).reduce((r: number, e) => r + e, 0)
	}
	static open(storage: platform.DurableObjectState["storage"]): Portion
	static open(storage: platform.DurableObjectState["storage"] | undefined): Portion | undefined
	static open(storage: platform.DurableObjectState["storage"] | undefined): Portion | undefined {
		return storage ? new Portion(storage) : undefined
	}
}
