import * as isoly from "isoly"
import { Continuable } from "../../Continuable"
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
				options?: { retention?: isoly.TimeSpan; meta?: undefined }
			): Promise<void> => {
				const splitted = value && split(value)
				await (splitted == undefined
					? backend.set(key)
					: backend.set(key, splitted[1], {
							...options,
							meta: splitted[0],
							retention: options?.retention,
					  }))
			},
			get: async (key: string): Promise<{ value: V & M; retention?: isoly.TimeSpan } | undefined> => {
				const response = await backend.get(key)
				return (
					response &&
					response?.meta && {
						value: { ...response.value, ...response.meta },
					}
				)
			},
			list: async (options?: string | ListOptions): Promise<Continuable<ListItem<V & M, undefined>>> => {
				const response = await backend.list(options)
				const result = (await Continuable.awaits(
					response
						.map(
							async user =>
								user &&
								user.meta &&
								(({ value: value, meta: meta, ...r }) => ({
									value: { ...meta, ...value } as V & M,
									...r,
								}))(user)
						)
						.filter(async user => user)
				)) as Continuable<ListItem<V & M, undefined>>
				return result
			},
		}
	}
}
