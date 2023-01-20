import * as isoly from "isoly"
import { Continuable } from "/../Continuable"
import { KeyValueStore } from "../KeyValueStore"
import { ListItem } from "../ListItem"
import { ListOptions } from "../ListOptions"
import { open as kvOpen } from "../open"

export namespace OnlyMeta {
	export function create<V = any>(backend: KeyValueStore<string, V> = kvOpen<"", V>()): KeyValueStore<V, undefined> {
		return {
			set: async (
				key: string,
				value?: V,
				options?: { retention?: isoly.DateSpan; meta?: undefined }
			): Promise<void> => {
				await (value == undefined ? backend.set(key) : backend.set(key, "", { ...options, meta: value }))
			},
			get: async (key: string): Promise<{ value: V; retention?: isoly.DateSpan } | undefined> => {
				const response = await backend.get(key)
				return (
					response &&
					response?.meta && {
						value: typeof response.meta == "string" ? response.meta : { ...response.meta },
					}
				)
			},
			list: async (options?: string | ListOptions): Promise<Continuable<ListItem<V, undefined>>> => {
				console.log("P2?")
				const response = await backend.list(options)
				const result: Continuable<ListItem<V, undefined>> = await Promise.all(
					response.map(async item => ({
						...(({ meta: discard, ...r }) => r)(item),
						value: typeof item.meta == "string" || Array.isArray(item.meta) ? item.meta : ({ ...item.meta } as V),
					}))
				)
				console.log("E.P2")
				return result
			},
		}
	}
}
