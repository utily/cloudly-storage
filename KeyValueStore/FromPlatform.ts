import * as isoly from "isoly"
import * as platform from "@cloudflare/workers-types"
import { Continuable } from "./Continuable"
import { KeyValueStore } from "./KeyValueStore"
import { ListItem } from "./ListItem"
import { ListOptions } from "./ListOptions"
import { range } from "./range"

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
		const o = ListOptions.get(options)
		let data
		let response: Continuable<ListItem<V, M>>
		let result: Continuable<ListItem<V, M>> = []
		let rangeLimitCheck = true
		do {
			if (o.range && (o.range[0] || o.range[1]))
				data = await this.backend.list({ prefix: o.prefix, cursor: o.cursor })
			else
				data = await this.backend.list({ prefix: o.prefix, limit: o.limit, cursor: o.cursor })
			response = await Promise.all(
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
			result = result.concat(response)
			result.cursor = undefined
			if (o.range && (o.range[0] || o.range[1]))
				result = range(result, o)
			else if ("cursor" in data)
				result.cursor = data.cursor
			if (result.cursor && o.limit && result.length < o.limit)
				o.cursor = result.cursor
			else
				rangeLimitCheck = false
		} while (rangeLimitCheck)
		return result
	}
}
