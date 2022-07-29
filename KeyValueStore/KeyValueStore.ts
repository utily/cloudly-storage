import * as isoly from "isoly"
import { ListItem } from "./ListItem"
import { ListOptions } from "./ListOptions"

export interface KeyValueStore<V = any, M = Record<string, any>> {
	set(key: string, value?: undefined): Promise<void>
	set(key: string, value: V, options?: { expires?: isoly.DateTime; meta?: M }): Promise<void>
	get(key: string): Promise<{ value: V; meta?: M } | undefined>
	list(options?: string | ListOptions): Promise<ListItem<V, M>[] & { cursor?: string }>
}
