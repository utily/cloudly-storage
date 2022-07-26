import * as isoly from "isoly"
import * as platform from "../platform"
import { KeyValueStore } from "./KeyValueStore"
import { ListItem } from "./ListItem"
import { ListOptions } from "./ListOptions"

export class FromPlatform<
	V extends string | ArrayBuffer | ReadableStream = string,
	M extends Record<string, unknown> = Record<string, unknown>
> implements KeyValueStore<V, M>
{
	constructor(
		private readonly backend: platform.KVNamespace,
		private readonly type: "text" | "arrayBuffer" | "stream"
	) {}
	async set(key: string, value: V, options: { expires?: isoly.DateTime; meta?: M }): Promise<void> {
		await this.backend.put(
			key,
			value,
			Object.fromEntries(
				Object.entries({
					expirationTtl:
						options.expires != undefined
							? Math.max(60, isoly.DateTime.epoch(options.expires) - isoly.DateTime.epoch(isoly.DateTime.now()))
							: undefined, // Expiration did not work.
					metadata: options.meta,
				}).filter(([key, value]) => value)
			)
		)
	}
	async get(key: string): Promise<{ value: V; meta: M } | undefined> {
		const data = await this.backend.getWithMetadata(key, { type: this.type as any })
		return data.value != null
			? {
					value: data.value as V,
					meta: (data.metadata ?? {}) as M,
			  }
			: undefined
	}
	async list(options?: string | ListOptions): Promise<{
		data: ListItem<V, M>[]
		cursor?: string
	}> {
		const o = ListOptions.get(options)
		const result = await this.backend.list({ prefix: o.prefix, limit: o.limit, cursor: o.cursor })
		return {
			data: await Promise.all(
				result.keys
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
			),
			cursor: result.list_complete ? result.cursor : undefined,
		}
	}
}
