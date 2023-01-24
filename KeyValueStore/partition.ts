import * as isoly from "isoly"
import { Continuable } from "../Continuable"
import { KeyValueStore } from "./KeyValueStore"
import { ListItem } from "./ListItem"
import { ListOptions } from "./ListOptions"

export function partition<V, M = undefined>(
	backend: KeyValueStore<V, M>,
	prefix: string,
	retention?: isoly.TimeSpan
): KeyValueStore<V, M> {
	const prefixLength = prefix.length
	return {
		set: async (key: string, value?: V, options?: { retention: isoly.TimeSpan; meta?: M }): Promise<void> => {
			await (value == undefined
				? backend.set(prefix + key)
				: backend.set(prefix + key, value, {
						...options,
						retention: options?.retention ?? retention,
				  }))
		},
		get: async (key: string): Promise<{ value: V; retention?: isoly.TimeSpan; meta?: M } | undefined> => {
			const result = await backend.get(prefix + key)
			return result as { value: V; retention?: isoly.TimeSpan; meta?: M } | undefined
		},
		list: async (options?: string | ListOptions): Promise<Continuable<ListItem<V, M>>> => {
			//const response = await backend.list(
			//	typeof options == "object" ? { ...options, prefix: prefix + (options.prefix ?? "") } : prefix + (options ?? "")
			//)
			const response = Continuable.create(
				await backend.list(
					typeof options == "object"
						? { ...options, prefix: prefix + (options.prefix ?? "") }
						: prefix + (options ?? "")
				)
			)
			//const r = Continuable.create(response)
			//console.log("START")
			//console.log(r)
			//console.log(response.cursor)
			//console.log(Continuable.is(response))
			const res = response.map(i => i)
			//const res2 = r.map(i => i)
			console.log(res)
			//console.log(res2)
			//console.log("END")
			//console.log(res.cursor)
			console.log(response)
			return await Continuable.await(response.map(async user => ({ ...user, key: user.key.slice(prefixLength) })))
		},
	}
}
