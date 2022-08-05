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
		if (value == undefined)
			delete this.data[key]
		else
			this.data[key] = { value, ...options, meta: options?.meta && JSON.stringify(options.meta) }
	}
	async get(key: string): Promise<{ value: V; meta?: M } | undefined> {
		let result = this.data[key]
		if (result != undefined)
			if (result.expires && result.expires < isoly.DateTime.now())
				result = undefined
		return result && (({ expires: disregard, meta, ...user }) => ({ ...user, meta: meta && JSON.parse(meta) }))(result)
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
				([key, user]) => user && (!o.prefix || key.startsWith(o.prefix)) && (!user.expires || user.expires >= now)
			) as unknown as [string, user<V, string>][]
		)
			.map<ListItem<V, M>>(([key, user]) => ({
				key,
				...user,
				meta: user.meta ? (JSON.parse(user.meta) as M) : undefined,
			}))
			.map<ListItem<V, M>>(o.values ? user => user : ({ value: disregard, ...user }) => user)
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
