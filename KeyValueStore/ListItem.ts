import * as isoly from "isoly"

export interface ListItem<V = any, M = Record<string, any>> {
	key: string
	value?: V
	expires?: isoly.DateTime
	meta?: M
}
