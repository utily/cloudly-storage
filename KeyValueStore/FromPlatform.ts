import * as cryptly from "cryptly"
import * as isoly from "isoly"
import * as platform from "@cloudflare/workers-types"
import { Continuable } from "./Continuable"
import { KeyValueStore } from "./KeyValueStore"
import { ListItem } from "./ListItem"
import { ListOptions } from "./ListOptions"

export class FromPlatform<
	V extends string | ArrayBuffer | ArrayBufferView | platform.ReadableStream = string,
	M = Record<string, any>
> implements KeyValueStore<V, M>
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
		let result: Continuable<ListItem<V, M>>
		const o = ListOptions.get(options)
		if (o.range)
			result = await this.range(o)
		else {
			const data = await this.backend.list({ prefix: o.prefix, limit: o.limit, cursor: o.cursor })
			result = await Promise.all(
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
			if (!data.list_complete && data.cursor)
				result.cursor = data.cursor
		}
		return result
	}

	private async range(options: ListOptions): Promise<Continuable<ListItem<V, M>>> {
		const firstKey = (options.prefix ?? "") + (options.range && options.range[0]) ?? ""
		const lastKey = options.range && options.range[1] ? (options.prefix ?? "") + options.range[1] : undefined
		const search = firstKey.slice(0, -1)

		// i hate do-while loops even more than normal while loops
		let data = await this.backend.list({ prefix: search, cursor: options.cursor })
		let result: Continuable<ListItem<V, M>> = await Promise.all(
			data.keys.map(async item => ({
				key: item.name,
				expires: item.expiration ? isoly.DateTime.create(item.expiration) : undefined,
				meta: item.metadata as M,
			}))
		)
		// can get "unlucky" here and the last item in result is >= first key, would cause us to return a list of size 1, but further calls with the cursor would still be correct
		while (result.length > 0 && result.every(item => item.key >= firstKey) && !data.list_complete && data.cursor) {
			data = await this.backend.list({ prefix: search, cursor: data.cursor })
			result = await Promise.all(
				data.keys.map(async item => ({
					key: item.name,
					expires: item.expiration ? isoly.DateTime.create(item.expiration) : undefined,
					meta: item.metadata as M,
				}))
			)
		}
		result = result.filter(item => item.key >= firstKey && (lastKey ? lastKey > item.key : true))
		let cursor: string | undefined
		if (options.limit && result.length > options.limit) {
			result = result.slice(0, options.limit)
			cursor = cryptly.Base64.encode(result[result.length - 1].key, "url")
		}
		result =
			options.values == true
				? await Promise.all(
						result.map(async item => ({
							...item,
							value: ((await this.backend.get(item.key, { type: this.type as any })) as any) ?? undefined, //???????????
						}))
				  )
				: result
		if (!data.list_complete && typeof data.cursor == "string" && lastKey && lastKey > (result.at(-1)?.key ?? ""))
			result.cursor = data.cursor
		else
			result.cursor = cursor
		return result
	}
}
