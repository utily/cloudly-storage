import * as platform from "../../../platform"

export namespace Portion {
	export async function put<T = unknown>(
		data: Record<string, T>,
		state: platform.DurableObjectState,
		keyLimit = 128
	): Promise<Record<string, T>> {
		let result: Record<string, T> = {}
		const promises: Promise<void>[] = []
		const tupleList = Object.entries(data)
		for (let i = 0; i < tupleList.length; i += keyLimit) {
			const segment = Object.fromEntries(tupleList.slice(i, i + keyLimit))
			promises.push(state.storage.put<T>(segment))
			result = { ...result, ...segment }
		}
		await Promise.all(promises)
		return result
	}
	export async function get<T = unknown>(
		data: string[],
		state: platform.DurableObjectState,
		keyLimit = 128
	): Promise<Record<string, T>> {
		const promises: Promise<Map<string, T>>[] = []
		for (let i = 0; i < data.length; i += keyLimit) {
			const segment = data.slice(i, i + keyLimit)
			promises.push(state.storage.get<T>(segment))
		}
		return (await Promise.all(promises)).reduce(
			(r: Record<string, T>, e) => ({ ...r, ...Object.fromEntries(e.entries()) }),
			{}
		)
	}
	export async function remove(keys: string[], state: platform.DurableObjectState, keyLimit = 128): Promise<number> {
		const promises: Promise<number>[] = []
		for (let i = 0; i < keys.length; i += keyLimit) {
			const segment = keys.slice(i, i + keyLimit)
			promises.push(state.storage.delete(segment))
		}
		return (await Promise.all(promises)).reduce((r: number, e) => r + e, 0)
	}
}
