import * as isoly from "isoly"
import * as platform from "../platform"
import { KeyValueStore } from "./KeyValueStore"
import { ListItem } from "./ListItem"
import { ListOptions } from "./ListOptions"

export class FromPlatform<
	V extends string | ArrayBuffer | ReadableStream = string | ArrayBuffer | ReadableStream,
	M extends Record<string, unknown> = Record<string, unknown>
> implements KeyValueStore<V, M>
{
	constructor(private readonly backend: platform.KVNamespace) {}
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
		const data = await this.backend.getWithMetadata(key)
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
		if (typeof options == "string")
			options = { prefix: options }
		const result = await this.backend.list({ prefix: options?.prefix, limit: options?.limit, cursor: options?.cursor })
		return {
			data: result.keys.map(
				item =>
					Object.defineProperty(
						{
							key: item.name,
							expires: item.expiration ? isoly.DateTime.create(item.expiration) : undefined,
							meta: item.metadata as M,
						},
						"value",
						{ get: () => this.get(item.name) }
					) as ListItem<V, M>
			),
			cursor: result.list_complete ? result.cursor : undefined,
		}
	}
}
