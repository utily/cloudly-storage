import * as isoly from "isoly"
import { KeyValueStore } from "./KeyValueStore"
import { ListItem } from "./ListItem"
import { ListOptions } from "./ListOptions"

interface Item<V = unknown, M extends Record<string, unknown> = Record<string, unknown>> {
	value: V
	expires?: isoly.DateTime
	meta?: M
}

export class InMemory<
	V extends string | ArrayBuffer | ReadableStream = string | ArrayBuffer | ReadableStream,
	M extends Record<string, unknown> = Record<string, unknown>
> implements KeyValueStore<V>
{
	private readonly data: Record<string, Item<V, M> | undefined> = {}
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	private constructor() {}
	async set(key: string, value: V, options: { expires?: isoly.DateTime; meta?: M }): Promise<void> {
		this.data[key] = { value, ...options }
	}
	async get(key: string): Promise<{ value: V; meta?: M } | undefined> {
		let result = this.data[key]
		if (result != undefined)
			if (!result.expires || result.expires >= isoly.DateTime.now())
				result = undefined
			else
				delete result.expires
		return result
	}
	async list(options?: string | ListOptions): Promise<{
		data: ListItem<V, M>[]
		cursor?: string
	}> {
		const prefix = typeof options == "string" ? options : options?.prefix
		const now = isoly.DateTime.now()
		return {
			data: Object.entries(this.data)
				.filter(([key, data]) => data && (!prefix || key.startsWith(prefix)) && (!data.expires || data.expires >= now))
				.map<ListItem<V, M>>(
					([key, data]) =>
						Object.defineProperty({ key, ...data }, "value", async () => data?.value) as unknown as ListItem<V, M>
				),
		}
	}
	private static opened: Record<string, InMemory> = {}
	static open<V extends string | ArrayBuffer | ReadableStream = string | ArrayBuffer | ReadableStream>(
		namespace?: string
	): InMemory<V> {
		return namespace
			? (this.opened[namespace] as InMemory<V>) ?? (this.opened[namespace] = this.open())
			: new InMemory<V>()
	}
	static exists(namespace?: string): boolean {
		return !!(namespace && this.opened[namespace])
	}
}
