import * as isoly from "isoly"

export interface ListItem<V = unknown, M extends Record<string, unknown> = Record<string, unknown>> {
	key: string
	get value(): Promise<V>
	expires?: isoly.DateTime
	meta?: M
}
