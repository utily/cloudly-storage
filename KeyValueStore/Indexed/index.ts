import { isoly } from "isoly"
import { Continuable } from "../Continuable"
import { KeyValueStore } from "../KeyValueStore"
import { ListItem } from "../ListItem"
import { ListOptions } from "../ListOptions"
import { OnlyMeta } from "../OnlyMeta"
import { partition } from "../partition"

export class Indexed<V, I extends string, M = any> implements KeyValueStore<V, M> {
	private constructor(private data: KeyValueStore<V, M>, private indexes: Record<I, Index<V>>) {}
	set(key: string, value?: undefined): Promise<void>
	set(key: string, value: V, options?: { retention?: isoly.TimeSpan; meta?: M }): Promise<void>
	async set(key: string, value?: V, options?: { retention?: isoly.TimeSpan; meta?: M }): Promise<void> {
		const old = (await this.data.get(key))?.value
		if (value)
			await this.data.set(key, value, options)
		else if (old)
			await this.data.set(key)
		await Promise.all(Object.values<Index<V>>(this.indexes).map(index => index.set(value, old, key, options)))
	}
	async get(key: string, index?: I): Promise<{ value: V; meta?: M | undefined } | undefined> {
		let result: { value: V; meta?: M | undefined } | undefined
		if (index) {
			const indexKey = await this.indexes[index].get(key)
			result = indexKey ? await this.data.get(indexKey) : undefined
		} else
			result = await this.data.get(key)
		return result
	}
	async list(options?: string | (ListOptions & { index?: I }) | undefined): Promise<Continuable<ListItem<V, M>>> {
		return typeof options == "object" && options?.index
			? await Continuable.awaits(
					(
						await this.indexes[options.index].list(options)
					).map(async key => (options.values ? { key, ...(await this.data.get(key)) } : { key }))
			  )
			: await this.data.list(options)
	}
	static create<V, I extends string, M = any>(
		backend: KeyValueStore<V, M>,
		indexes: Record<I, (value: V) => string | undefined>
	): Indexed<V, I, M> {
		return new Indexed(
			partition(backend, "|"),
			Object.fromEntries(
				Object.entries<(value: V) => string | undefined>(indexes).map(([index, create]) => [
					index,
					Index.create<V>(create, partition(backend as KeyValueStore<string, string>, index + "|")),
				])
			) as Record<I, Index<V>>
		)
	}
}

class Index<V> {
	constructor(private index: (value: V) => string | undefined, private backend: KeyValueStore<string>) {}
	async set(
		value: V | undefined,
		oldValue: V | undefined,
		key: string,
		options?: { retention?: isoly.TimeSpan | undefined }
	): Promise<void> {
		const index = value && this.index(value)
		const oldIndex = oldValue && this.index(oldValue)
		if (oldIndex && (!index || index !== oldIndex))
			await this.backend.set(oldIndex)
		if (index)
			await this.backend.set(index, key, options)
	}
	async get(key: string): Promise<string | undefined> {
		return (await this.backend.get(key))?.value
	}
	async list(options?: string | ListOptions): Promise<Continuable<string>> {
		return (await this.backend.list(options)).map(item => item.value ?? "")
	}
	static create<V>(index: (value: V) => string | undefined, backend: KeyValueStore<string, string>): Index<V> {
		return new Index(index, OnlyMeta.create<string>(backend))
	}
}
