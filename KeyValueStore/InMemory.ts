import * as cryptly from "cryptly"
import * as isoly from "isoly"
import * as platform from "@cloudflare/workers-types"
import { Continuable } from "./Continuable"
import { KeyValueStore } from "./KeyValueStore"
import { ListItem } from "./ListItem"
import { ListOptions } from "./ListOptions"
import { range } from "./range"

interface Item<V = any, M = Record<string, any>> {
	value: V
	expires?: isoly.DateTime
	meta?: M
}

export class InMemory<
	V extends string | ArrayBuffer | ArrayBufferView | platform.ReadableStream = string,
	M = Record<string, any>
> implements KeyValueStore<V>
{
	private readonly data: Record<string, Item<V, string> | undefined> = {}
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	private constructor(private retention?: isoly.TimeSpan) {}
	async set(key: string, value?: undefined): Promise<void>
	async set(key: string, value: V, options?: { retention?: isoly.TimeSpan; meta?: M }): Promise<void>
	async set(key: string, value?: V, options?: { retention?: isoly.TimeSpan; meta?: M }): Promise<void> {
		if (value == undefined)
			delete this.data[key]
		else
			this.data[key] = (({ expires, ...item }) => (expires ? { expires, ...item } : item))(
				(({ meta, ...item }) => (meta ? { meta, ...item } : item))({
					value,
					meta: options?.meta && JSON.stringify(options.meta),
					expires: options?.retention
						? isoly.DateTime.create(Date.now() + isoly.TimeSpan.toMilliseconds(options?.retention), "milliseconds")
						: undefined,
				})
			)
	}
	async get(key: string): Promise<{ value: V; meta?: M } | undefined> {
		let result = this.data[key]
		if (result != undefined)
			if (result.expires && result.expires < isoly.DateTime.now())
				result = undefined
		return result && (({ expires: disregard, meta, ...item }) => ({ ...item, meta: meta && JSON.parse(meta) }))(result)
	}
	async list(options?: string | ListOptions): Promise<Continuable<ListItem<V, M>>> {
		const o = ListOptions.get(options)
		const now = isoly.DateTime.now()
		const partition = Object.entries(this.data)
			.filter(
				([key, item]) => item && (!o.prefix || key.startsWith(o.prefix)) && (!item.expires || item.expires >= now)
			)
			.sort((left, right) => left[0].localeCompare(right[0], "en-US")) as unknown as [string, Item<V, string>][]
		let start =
			partition.findIndex(([key, value]) => {
				return key == o.cursor
			}) + 1
		if (o.cursor && start == 0) {
			try {
				const cursor = new cryptly.TextDecoder().decode(cryptly.Base64.decode(o.cursor, "url"))
				start =
					partition.findIndex(([key, value]) => {
						return key == cursor
					}) + 1 || partition.length
			} catch {
				start = 0
			}
		}
		let result = partition
			.slice(start)
			.map<ListItem<V, M | undefined>>(([key, item]) =>
				item.meta
					? {
							key,
							...item,
							meta: JSON.parse(item.meta) as M,
					  }
					: ({ key, ...item } as ListItem<V, undefined>)
			)
			.map<ListItem<V, M>>(o.values ? item => item : ({ value: disregard, ...item }) => item)
		if (o.range)
			result = range(result, o)
		if (!o.values)
			result = result.map(({ value, ...item }) => item)
		return result.length > (o.limit ?? 0)
			? Object.defineProperty(result.slice(0, o.limit), "cursor", {
					value: result.slice(0, o.limit).slice(-1)[0].key,
			  })
			: result
	}
	private static opened: Record<string, InMemory> = {}
	static open<
		V extends string | ArrayBuffer | ArrayBufferView | platform.ReadableStream = string,
		M = Record<string, any>
	>(namespace?: string, retention?: isoly.TimeSpan): InMemory<V, M> {
		return namespace
			? (this.opened[namespace] as InMemory<V, M>) ?? (this.opened[namespace] = this.open(undefined, retention))
			: new InMemory<V, M>(retention)
	}
	static exists(namespace?: string): boolean {
		return !!(namespace && this.opened[namespace])
	}
}
