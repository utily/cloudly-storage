import * as isoly from "isoly"
import { Continuable } from "./Continuable"
import { ListItem } from "./ListItem"
import { ListOptions } from "./ListOptions"
export interface KeyValueStore<V = any, M = any> {
	set(key: string, value?: undefined): Promise<void>
	set(key: string, value: V, options?: { retention?: isoly.TimeSpan; meta?: M }): Promise<void>
	get(key: string): Promise<{ value: V; meta?: M } | undefined>
	list(options?: string | ListOptions): Promise<Continuable<ListItem<V, M>>>
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
