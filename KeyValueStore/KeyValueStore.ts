import * as isoly from "isoly"
import { ListItem } from "./ListItem"
import { ListOptions } from "./ListOptions"

export interface KeyValueStore<V = unknown, M extends Record<string, unknown> = Record<string, unknown>> {
	set(key: string, value: V, options?: { expires?: isoly.DateTime; meta?: M }): Promise<void>
	get(key: string): Promise<{ value: V; meta?: M } | undefined>
	list(options?: string | ListOptions): Promise<{ data: ListItem[]; cursor?: string }>
}
