import { methodNotAllowed } from "gracely/dist/client"
import * as isoly from "isoly"
import { Json } from "../Json"
import { KeyValueStore } from "../KeyValueStore"
import { ListItem } from "../ListItem"
import { ListOptions } from "../ListOptions"

export namespace InMeta {
	export function create<V extends object, M extends object>(
		split: (value: V & M) => [M, V],
		backend: KeyValueStore<V, M> = Json.create<V, M>()
	): KeyValueStore<V & M, undefined> {
		return {
			set: async (
				key: string,
				value?: V & M,
				options?: { expires?: isoly.DateTime; meta?: undefined }
			): Promise<void> => {
				const splitted = value && split(value)
				await (splitted == undefined
					? backend.set(key)
					: backend.set(key, splitted[1], { ...options, meta: splitted[0] }))
			},
			get: async (key: string): Promise<{ value: V & M; expires?: isoly.DateTime } | undefined> => {
				const response = await backend.get(key)
				return (
					response &&
					response?.meta && {
						value: { ...response.value, ...response.meta },
					}
				)
			},
			list: async (options?: string | ListOptions): Promise<ListItem<V & M, undefined>[] & { cursor?: string }> => {
				const response = await backend.list(options)
				const result = (await Promise.all(
					response
						.map(
							async item =>
								item &&
								item.meta &&
								(({ value: value, meta: meta, ...r }) => ({
									value: { ...meta, ...value } as V & M,
									...r,
								}))(item)
						)
						.filter(async item => item)
				)) as ListItem<V & M, undefined>[] & { cursor?: string }
				if (response.cursor)
					result.cursor = response.cursor
				return result
			},
		}
	}
}
