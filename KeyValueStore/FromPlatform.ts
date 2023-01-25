import * as isoly from "isoly"
import { Continuable } from "../Continuable"
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
	async set(key: string, value: V, options?: { retention?: isoly.TimeSpan; meta?: M }): Promise<void>
	async set(key: string, value?: V, options?: { retention?: isoly.TimeSpan; meta?: M }): Promise<void> {
		if (value == undefined)
			await this.backend.delete(key)
		else
			await this.backend.put(
				key,
				value,
				Object.fromEntries(
					Object.entries({
						expirationTtl:
							options?.retention != undefined ? Math.max(60, isoly.TimeSpan.toSeconds(options?.retention)) : undefined,
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
	async list(options?: string | ListOptions): Promise<Continuable<ListItem<V, M>>> {
		const o = ListOptions.get(options)
		const data = await this.backend.list({ prefix: o.prefix, limit: o.limit, cursor: o.cursor })
		const result: Continuable<ListItem<V, M>> = await Promise.all(
			data.keys
				.map(async item => ({
					key: item.name,
					expires: item.expiration ? isoly.DateTime.create(item.expiration) : undefined,
					meta: item.metadata as M,
				}))
				.map(
					o.values
						? i =>
								i.then(async item => ({
									...item,
									value: await this.backend.get(item.key, { type: this.type as any }),
								}))
						: i => i
				)
		)
		if (data.cursor)
			result.cursor = data.cursor
		return result
	}
}
