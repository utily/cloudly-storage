import * as isoly from "isoly"
import { Continuable } from "../Continuable"
import { KeyValueStore } from "./KeyValueStore"
import { ListItem } from "./ListItem"
import { ListOptions } from "./ListOptions"

export function rangeList<V, M = undefined>(backend: KeyValueStore<V, M>, prefix: string): KeyValueStore<V, M> {
	const prefixLength = prefix.length
	return {
		set: async (key: string, value?: V, options?: { retention: isoly.TimeSpan; meta?: M }): Promise<void> => {
			await (value == undefined ? backend.set(key) : backend.set(key, value, options))
		},
		get: async (key: string): Promise<{ value: V; retention?: isoly.TimeSpan; meta?: M } | undefined> => {
			return await backend.get(key)
		},
		list: async (options?: string | ListOptions): Promise<Continuable<ListItem<V, M>>> => {
			const response = await backend.list(
				typeof options == "object" ? { ...options, prefix: options.prefix ?? "" } : options ?? ""
			)
			const result: Continuable<ListItem<V, M>> = await Promise.all(
				response.map(async user => ({ ...user, key: user.key } as ListItem<V, M>))
			)
			return result
		},
	}
}
