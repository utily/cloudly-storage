import * as isoly from "isoly"
import { KeyValueStore } from "./KeyValueStore"
import { ListItem } from "./ListItem"
import { ListOptions } from "./ListOptions"

interface user<V = any, M = Record<string, any>> {
	value: V
	expires?: isoly.DateTime
	meta?: M
}

export class InMemory<V extends string | ArrayBuffer | ReadableStream = string, M = Record<string, any>>
	implements KeyValueStore<V>
{
	private readonly data: Record<string, user<V, string> | undefined> = {}
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	private constructor() {}
	async set(key: string, value?: undefined): Promise<void>
	async set(key: string, value: V, options?: { expires?: isoly.DateTime; meta?: M }): Promise<void>
	async set(key: string, value?: V, options?: { expires?: isoly.DateTime; meta?: M }): Promise<void> {
		console.log("inMemory.set.key: ", key)
		console.log("inMemory.set.value: ", JSON.stringify(value, null, 2))
		console.log("inMemory.set.options: ", JSON.stringify(options, null, 2))
		if (value == undefined)
			delete this.data[key]
		else
			this.data[key] = { value, ...options, meta: options?.meta && JSON.stringify(options.meta) }
	}
	async get(key: string): Promise<{ value: V; meta?: M } | undefined> {
		console.log("inMemory.get.key: ", key)
		console.log("this.data", JSON.stringify(this.data, null, 2))
		let result = this.data[key]
		if (result != undefined)
			if (result.expires && result.expires < isoly.DateTime.now())
				result = undefined
		const realResult =
			result && (({ expires: disregard, meta, ...user }) => ({ ...user, meta: meta && JSON.parse(meta) }))(result)
		console.log("inMeta.get.realResult")
		return realResult
	}
	async list(options?: string | ListOptions): Promise<
		ListItem<V, M>[] & {
			cursor?: string
		}
	> {
		const o = ListOptions.get(options)
		const now = isoly.DateTime.now()
		const partition = Object.entries(this.data).filter(
			([key, user]) => user && (!o.prefix || key.startsWith(o.prefix)) && (!user.expires || user.expires >= now)
		) as unknown as [string, user<V, string>][]
		const start =
			partition.findIndex(([key, value]) => {
				return key == o.cursor
			}) + 1
		const result = partition
			.slice(start)
			.map<ListItem<V, M>>(([key, user]) => ({
				key,
				...user,
				meta: user.meta ? (JSON.parse(user.meta) as M) : undefined,
			}))
			.map<ListItem<V, M>>(o.values ? user => user : ({ value: disregard, ...user }) => user)
		return result.length > (o.limit ?? 0)
			? Object.defineProperty(result.slice(0, o.limit), "cursor", {
					value: result.slice(0, o.limit).slice(-1)[0].key,
			  })
			: result
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
