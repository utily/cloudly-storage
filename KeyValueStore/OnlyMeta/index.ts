import * as isoly from "isoly"
import { KeyValueStore } from "../KeyValueStore"
import { ListItem } from "../ListItem"
import { ListOptions } from "../ListOptions"
import { open as kvOpen } from "../open"

export namespace OnlyMeta {
	export function create<V = any>(backend: KeyValueStore<string, V> = kvOpen<"", V>()): KeyValueStore<V, undefined> {
		return {
			set: async (key: string, value?: V, options?: { expires?: isoly.DateTime; meta?: undefined }): Promise<void> => {
				await (value == undefined ? backend.set(key) : backend.set(key, "", { ...options, meta: value }))
			},
			get: async (key: string): Promise<{ value: V; expires?: isoly.DateTime } | undefined> => {
				const response = await backend.get(key)
				return (
					response &&
					response?.meta && {
						value: { ...response.meta },
					}
				)
			},
			list: async (options?: string | ListOptions): Promise<ListItem<V, undefined>[] & { cursor?: string }> => {
				const response = await backend.list(options)
				const result: ListItem<V, undefined>[] & { cursor?: string } = await Promise.all(
					response.map(async item => ({
						...(({ meta: discard, ...r }) => r)(item),
						value: { ...item.meta } as V,
					}))
				)
				if (response.cursor)
					result.cursor = response.cursor
				return result
			},
		}
	}
}
