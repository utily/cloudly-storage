import * as isoly from "isoly"
import { KeyValueStore } from "./KeyValueStore"
import { ListItem } from "./ListItem"
import { ListOptions } from "./ListOptions"

interface Item<V = any, M = Record<string, any>> {
	value: V
	expires?: isoly.DateTime
	meta?: M
}

export class InMemory<V extends string | ArrayBuffer | ReadableStream = string, M = Record<string, any>>
	implements KeyValueStore<V>
{
	private readonly data: Record<string, Item<V, M> | undefined> = {}
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	private constructor() {}
	async set(key: string, value?: undefined): Promise<void>
	async set(key: string, value: V, options?: { expires?: isoly.DateTime; meta?: M }): Promise<void>
	async set(key: string, value?: V, options?: { expires?: isoly.DateTime; meta?: M }): Promise<void> {
		if (value == undefined)
			delete this.data[key]
		else
			this.data[key] = { value, ...options }
	}
	async get(key: string): Promise<{ value: V; meta?: M } | undefined> {
		let result = this.data[key]
		if (result != undefined)
			if (result.expires && result.expires < isoly.DateTime.now())
				result = undefined
		return result && (({ expires: disregard, ...item }) => item)(result)
	}
	async list(options?: string | ListOptions): Promise<
		ListItem<V, M>[] & {
			cursor?: string
		}
	> {
		const o = ListOptions.get(options)
		const now = isoly.DateTime.now()
		const result = (
			Object.entries(this.data).filter(
				([key, item]) => item && (!o.prefix || key.startsWith(o.prefix)) && (!item.expires || item.expires >= now)
			) as unknown as [string, Item<V, M>][]
		).map<ListItem<V, M>>(
			o.values ? ([key, item]) => ({ key, ...item }) : ([key, { value: disregard, ...item }]) => ({ key, ...item })
		)
		return result
	}
	private static opened: Record<string, InMemory> = {}
	static open<V extends string | ArrayBuffer | ReadableStream = string, M = Record<string, any>>(
		namespace?: string
	): InMemory<V, M> {
		return namespace
			? (this.opened[namespace] as InMemory<V, M>) ?? (this.opened[namespace] = this.open())
			: new InMemory<V, M>()
	}
	static exists(namespace?: string): boolean {
		return !!(namespace && this.opened[namespace])
	}
}
