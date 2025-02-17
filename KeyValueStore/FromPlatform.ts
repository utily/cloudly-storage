import { cryptly } from "cryptly"
import { isoly } from "isoly"
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
		const data = await this.backend.getWithMetadata<M>(key, { type: this.type as any })
		return data.value == null ? undefined : { value: data.value as V, meta: data.metadata ?? undefined }
	}
	async list(options?: string | ListOptions): Promise<Continuable<ListItem<V, M>>> {
		let result: Continuable<ListItem<V, M>>
		const o = ListOptions.get(options)
		if (o.range && (o.range[0] || o.range[1]))
			if (
				o.range[0] &&
				o.range[1] &&
				isoly.Date.is(isoly.Date.invert(o.range[0])) &&
				isoly.Date.is(isoly.Date.invert(o.range[1]))
			)
				result = await this.inverseDateRange(o)
			else if (o.range[0] && isoly.Date.is(isoly.Date.invert(o.range[0]))) {
				o.range[1] = isoly.Date.invert("2000-01-01")
				result = await this.inverseDateRange(o)
			} else if (o.range[1] && isoly.Date.is(isoly.Date.invert(o.range[1]))) {
				o.range[0] = isoly.Date.invert(isoly.Date.next(isoly.Date.now()))
				result = await this.inverseDateRange(o)
			} else
				result = await this.range(o)
		else {
			const data = await this.backend.list<M>({ prefix: o.prefix, limit: o.limit, cursor: o.cursor })
			result = await Promise.all(
				data.keys.map(async key => ({
					key: key.name,
					expires: key.expiration ? isoly.DateTime.create(key.expiration) : undefined,
					meta: key.metadata,
					value: !o.values ? undefined : (await this.backend.get<V>(key.name, { type: this.type as any })) ?? undefined,
				}))
			)
			if (!data.list_complete && data.cursor)
				result.cursor = data.cursor
		}
		return result
	}

	private async range(options: ListOptions): Promise<Continuable<ListItem<V, M>>> {
		const firstKey = (options.prefix ?? "") + (options.range && (options.range[0] ?? ""))
		const lastKey = options.range && options.range[1] ? (options.prefix ?? "") + options.range[1] : undefined
		let search = firstKey.slice(0, -1)

		let data = await this.backend.list({ prefix: search ?? "", cursor: options.cursor })
		let result: Continuable<ListItem<V, M>> = await Promise.all(
			data.keys.map(async item => ({
				key: item.name,
				expires: item.expiration ? isoly.DateTime.create(item.expiration) : undefined,
				meta: item.metadata as M,
			}))
		)
		while (!result.length && search.length) {
			search = search.slice(0, -1)
			data = await this.backend.list({ prefix: search ?? "", cursor: options.cursor })
			result = await Promise.all(
				data.keys.map(async item => ({
					key: item.name,
					expires: item.expiration ? isoly.DateTime.create(item.expiration) : undefined,
					meta: item.metadata as M,
				}))
			)
		}
		let lastInList: string | undefined = result.at(-1)?.key
		result = result.filter(item => item.key >= firstKey && (lastKey ? lastKey > item.key : true))
		while (
			lastInList &&
			result.length <= (options.limit ?? 500) &&
			(lastKey ? lastInList < lastKey : true) &&
			(lastInList == result.at(-1)?.key || lastInList < firstKey)
		) {
			const cursor: string = cryptly.Base64.encode(lastInList ?? "", "url")
			data = await this.backend.list({ cursor: cursor })
			result = result.concat(
				await Promise.all(
					data.keys.map(async item => ({
						key: item.name,
						expires: item.expiration ? isoly.DateTime.create(item.expiration) : undefined,
						meta: item.metadata as M,
					}))
				)
			)
			if (lastInList == result.at(-1)?.key)
				break
			lastInList = result.at(-1)?.key
			result = result.filter(item => item.key >= firstKey && (lastKey ? lastKey > item.key : true))
		}
		let cursor: string | undefined
		if (options.limit && result.length >= options.limit) {
			result = result.slice(0, options.limit)
			cursor = cryptly.Base64.encode(result[result.length - 1].key, "url")
		}
		result =
			options.values == true
				? await Promise.all(
						result.map(async item => ({
							...item,
							value: ((await this.backend.get(item.key, { type: this.type as any })) as any) ?? undefined,
						}))
				  )
				: result
		result.cursor = cursor
		return result
	}

	private async inverseDateRange(options: ListOptions): Promise<Continuable<ListItem<V, M>>> {
		let date = options.range && options.range[0] ? options.range[0] : ""
		const endDate = options.range && options.range[1] ? options.range[1] : ""
		let limit = options.limit ?? 100

		let data = await this.backend.list({ prefix: (options.prefix ?? "") + date, cursor: options.cursor, limit: limit })

		let result: Continuable<ListItem<V, M>> = await Promise.all(
			data.keys.map(async item => ({
				key: item.name,
				expires: item.expiration ? isoly.DateTime.create(item.expiration) : undefined,
				meta: item.metadata as M,
			}))
		)

		while (date < endDate && 0 < limit) {
			if (
				isoly.Date.getYear(endDate) - isoly.Date.getYear(date) > 1 &&
				isoly.Date.getMonth(date) == 12 &&
				isoly.Date.getDay(date) == 31
			) {
				date = isoly.Date.invert(isoly.Date.previousYear(isoly.Date.invert(date)))
				data = await this.backend.list({
					prefix: (options.prefix ?? "") + date.substring(0, 4),
					cursor: options.cursor,
					limit: limit,
				})
			} else {
				if (
					(isoly.Date.getMonth(endDate) - isoly.Date.getMonth(date) > 1 ||
						isoly.Date.getYear(endDate) - isoly.Date.getYear(date) > 0) &&
					isoly.Date.getDay(date) == 31
				) {
					date = isoly.Date.invert(isoly.Date.previousMonth(isoly.Date.invert(date)))
					data = await this.backend.list({
						prefix: (options.prefix ?? "") + date.substring(0, 7),
						cursor: options.cursor,
						limit: limit,
					})
				} else {
					date = isoly.Date.invert(isoly.Date.previous(isoly.Date.invert(date)))
					data = await this.backend.list({
						prefix: (options.prefix ?? "") + date,
						cursor: options.cursor,
						limit: limit,
					})
				}
			}
			limit -= data.keys.length
			result = result.concat(
				await Promise.all(
					data.keys.map(async item => ({
						key: item.name,
						expires: item.expiration ? isoly.DateTime.create(item.expiration) : undefined,
						meta: item.metadata as M,
					}))
				)
			)
			if (options.cursor && result.length)
				delete options.cursor
		}

		result =
			options.values == true
				? await Promise.all(
						result.map(async item => ({
							...item,
							value: ((await this.backend.get(item.key, { type: this.type as any })) as any) ?? undefined,
						}))
				  )
				: result
		if (!data.list_complete && data.cursor)
			result.cursor = data.cursor

		return result
	}
}
