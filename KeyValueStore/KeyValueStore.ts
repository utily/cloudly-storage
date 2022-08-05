import * as isoly from "isoly"
import { ListOptions } from "./ListOptions"
import { ListUser } from "./ListUser"

export interface KeyValueStore<V = any, M = Record<string, any>> {
	set(key: string, value?: undefined): Promise<void>
	set(key: string, value: V, options?: { expires?: isoly.DateTime; meta?: M }): Promise<void>
	get(key: string): Promise<{ value: V; meta?: M } | undefined>
	list(options?: string | ListOptions): Promise<ListUser<V, M>[] & { cursor?: string }>
}
export namespace KeyValueStore {
	export function is(value: KeyValueStore | any): value is KeyValueStore {
		return (
			typeof value == "object" &&
			typeof value.set == "function" &&
			typeof value.get == "function" &&
			typeof value.list == "function"
		)
	}
}
