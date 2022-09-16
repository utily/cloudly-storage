import * as isoly from "isoly"
import * as platform from "../platform"
import { KeyValueStore } from "./KeyValueStore"
import { ListItem } from "./ListItem"
import { ListOptions } from "./ListOptions"

export class FromPlatform<V extends string | ArrayBuffer | ReadableStream = string, M = Record<string, any>>
	implements KeyValueStore<V, M>
{
	constructor(
		private readonly backend: platform.KVNamespace,
		private readonly type: "text" | "arrayBuffer" | "stream"
	) {}
	async set(key: string, value?: undefined): Promise<void>
	async set(key: string, value: V, options?: { expires?: isoly.DateTime; meta?: M }): Promise<void>
	async set(key: string, value?: V, options?: { expires?: isoly.DateTime; meta?: M }): Promise<void> {
		if (value == undefined)
			await this.backend.delete(key)
		else
			await this.backend.put(
				key,
				value,
				Object.fromEntries(
					Object.entries({
						expirationTtl:
							options?.expires != undefined
								? Math.max(60, isoly.DateTime.epoch(options.expires) - isoly.DateTime.epoch(isoly.DateTime.now()))
								: undefined, // Expiration did not work.
						metadata: options?.meta,
					}).filter(([key, value]) => value)
				)
			)
	}
	async get(key: string): Promise<{ value: V; meta?: M } | undefined> {
		const data = await this.backend.getWithMetadata(key, { type: this.type as any })
		return data.value != null
			? {
					value: data.value as V,
					meta: data.metadata as M,
			  }
			: undefined
	}
	async list(options?: string | ListOptions): Promise<
		ListItem<V, M>[] & {
			cursor?: string
		}
	> {
		const o = ListOptions.get(options)
		const data = await this.backend.list({ prefix: o.prefix, limit: o.limit, cursor: o.cursor })
		const result: ListItem<V, M>[] & {
			cursor?: string
		} = await Promise.all(
			data.keys
				.map(async user => ({
					key: user.name,
					expires: user.expiration ? isoly.DateTime.create(user.expiration) : undefined,
					meta: user.metadata as M,
				}))
				.map(
					o.values
						? i =>
								i.then(async user => ({
									...user,
									value: await this.backend.get(user.key, { type: this.type as any }),
								}))
						: i => i
				)
		)
		if (!data.list_complete && data.cursor)
			result.cursor = data.cursor
		return result
	}
}
