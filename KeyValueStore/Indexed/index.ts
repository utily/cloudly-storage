import { TimeSpan } from "isoly"
import { Continuable } from "../Continuable"
import { KeyValueStore } from "../KeyValueStore"
import { ListItem } from "../ListItem"
import { ListOptions } from "../ListOptions"
import { OnlyMeta } from "../OnlyMeta"
import { partition } from "../partition"

export class Indexed<V, I extends string, M = any> implements KeyValueStore<V, M> {
	private constructor(private data: KeyValueStore<V, M>, private indexes: Record<I, Index<V>>) {}
	set(key: string, value?: undefined): Promise<void>
	set(key: string, value: V, options?: { retention?: TimeSpan; meta?: M }): Promise<void>
	async set(key: string, value?: V, options?: { retention?: TimeSpan; meta?: M }): Promise<void> {
		const old = (await this.data.get(key))?.value
		if (old) {
			await this.data.set(key)
			await Promise.all((Object.values(this.indexes) as Index<V>[]).map(index => index.set(old)))
		}
		if (value) {
			await this.data.set(key, value, options)
			await Promise.all((Object.values(this.indexes) as Index<V>[]).map(index => index.set(value, key, options)))
		}
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
	set(value: V): Promise<void>
	set(value: V, key: string, options?: { retention?: TimeSpan | undefined }): Promise<void>
	async set(value: V, key?: string, options?: { retention?: TimeSpan | undefined }): Promise<void> {
		const index = this.index(value)
		if (key && index)
			await this.backend.set(index, key, options)
		else if (index)
			await this.backend.set(index)
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
