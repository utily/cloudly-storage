import * as isoly from "isoly"
import { KeyValueStore } from "./KeyValueStore"
import { ListItem } from "./ListItem"
import { ListOptions } from "./ListOptions"

export function partition<V, M = undefined>(backend: KeyValueStore<V, M>, prefix: string): KeyValueStore<V, M> {
	const prefixLength = prefix.length
	return {
		set: async (key: string, value?: V, options?: { expires?: isoly.DateTime; meta?: M }): Promise<void> => {
			await (value == undefined ? backend.set(prefix + key) : backend.set(prefix + key, value, options))
		},
		get: async (key: string): Promise<{ value: V; expires?: isoly.DateTime; meta?: M } | undefined> => {
			const result = await backend.get(prefix + key)
			return result as { value: V; expires?: isoly.DateTime; meta?: M } | undefined
		},
		list: async (options?: string | ListOptions): Promise<ListItem<V, M>[] & { cursor?: string }> => {
			const response = await backend.list(
				typeof options == "object" ? { ...options, prefix: prefix + (options.prefix ?? "") } : prefix + (options ?? "")
			)
			const result: ListItem<V, M>[] & { cursor?: string } = await Promise.all(
				response.map(async item => ({ ...item, key: item.key.slice(prefixLength) } as ListItem<V, M>))
			)
			if (response.cursor)
				result.cursor = response.cursor
			return result
		},
	}
}
