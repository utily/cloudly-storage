import * as isoly from "isoly"
import { Continuable } from "../Continuable"
import { KeyValueStore } from "./KeyValueStore"
import { ListItem } from "./ListItem"
import { ListOptions } from "./ListOptions"

export function create<B, V, M = any>(
	backend: KeyValueStore<B, M>,
	to: (value: V | undefined) => Promise<B>,
	from: (value: B) => Promise<V>
): KeyValueStore<V, M> {
	return {
		set: async (key: string, value?: V, options?: { expires?: isoly.DateTime; meta?: M }): Promise<void> => {
			await (value == undefined && !options ? backend.set(key) : backend.set(key, await to(value), options))
		},
		get: async (key: string): Promise<{ value: V; expires?: isoly.DateTime; meta?: M } | undefined> => {
			const result = await backend.get(key)
			return result && { ...result, value: await from(result.value) }
		},
		list: async (options?: string | ListOptions): Promise<Continuable<ListItem<V, M>>> => {
			const response = await backend.list(options)
			return await Continuable.awaits(
				response.map(async user => ({ ...user, value: user.value && (await from(user.value)) }))
			)
		},
	}
}
