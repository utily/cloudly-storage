import * as cryptly from "cryptly"
import * as isoly from "isoly"
import * as platform from "../platform"
import { FromPlatform } from "./FromPlatform"
import { InMemory } from "./InMemory"
import { KeyValueStore as Interface } from "./KeyValueStore"
import { ListItem } from "./ListItem"
import { ListOptions } from "./ListOptions"

export type KeyValueStore<V = any, M = Record<string, any>> = Interface<V, M>

export namespace KeyValueStore {
	export function is(value: KeyValueStore | any): value is KeyValueStore {
		return (
			typeof value == "object" &&
			typeof value.set == "function" &&
			typeof value.get == "function" &&
			typeof value.list == "function"
		)
	}
	export function create<B, V, M = Record<string, any>>(
		backend: Interface<B, M>,
		to: (value: V) => Promise<B>,
		from: (value: B) => Promise<V>
	): Interface<V, M> {
		return {
			set: async (key: string, value?: V, options?: { expires?: isoly.DateTime; meta?: M }): Promise<void> => {
				await (value == undefined ? backend.set(key) : backend.set(key, await to(value), options))
			},
			get: async (key: string): Promise<{ value: V; expires?: isoly.DateTime; meta?: M } | undefined> => {
				const result = await backend.get(key)
				return result && { ...result, value: await from(result.value) }
			},
			list: async (options?: string | ListOptions): Promise<ListItem<V, M>[] & { cursor?: string }> => {
				const response = await backend.list(options)
				const result: ListItem<V, M>[] & { cursor?: string } = await Promise.all(
					response.map(async item => ({ ...item, value: item.value && (await from(item.value)) }))
				)
				if (response.cursor)
					result.cursor = response.cursor
				return result
			},
		}
	}
	export function partition<V, M = Record<string, any>>(backend: Interface<any>, prefix: string): Interface<V, M> {
		const prefixLength = prefix.length
		return {
			set: async (key: string, value?: V, options?: { expires?: isoly.DateTime; meta?: M }): Promise<void> => {
				await (value == undefined ? backend.set(prefix + key) : backend.set(prefix + key, value, options))
			},
			get: async (key: string): Promise<{ value: V; expires?: isoly.DateTime; meta?: M } | undefined> => {
				const result = await backend.get(prefix + key)
				return result as { value: V; expires?: isoly.DateTime; meta?: M } | undefined
			},
			list: async (options?: string | ListOptions): Promise<ListItem<V, M>[] & { cursor?: string }> => {
				const response = await backend.list(
					typeof options == "object"
						? { ...options, prefix: prefix + (options.prefix ?? "") }
						: prefix + (options ?? "")
				)
				const result: ListItem<V, M>[] & { cursor?: string } = await Promise.all(
					response.map(async item => ({ ...item, key: item.key.slice(prefixLength) } as ListItem<V, M>))
				)
				if (response.cursor)
					result.cursor = response.cursor
				return result
			},
		}
	}
	export function open<V extends string = string, M = Record<string, any>>(
		namespace?: string | platform.KVNamespace,
		type?: "text"
	): Interface<V, M>
	export function open<V extends ArrayBuffer = ArrayBuffer, M = Record<string, any>>(
		namespace: string | platform.KVNamespace | undefined,
		type: "arrayBuffer"
	): Interface<V, M>
	export function open<V extends ReadableStream = ReadableStream, M = Record<string, any>>(
		namespace: string | platform.KVNamespace | undefined,
		type: "stream"
	): Interface<V, M>
	export function open<V extends string | ArrayBuffer | ReadableStream = string, M = Record<string, any>>(
		namespace?: string | platform.KVNamespace,
		type: "text" | "arrayBuffer" | "stream" = "text"
	): Interface<V, M> {
		return typeof namespace != "object" ? InMemory.open<V, M>(namespace) : new FromPlatform<V, M>(namespace, type)
	}
	export function exists(namespace?: string | platform.KVNamespace): boolean {
		return typeof namespace != "object" && InMemory.exists(namespace)
	}
	export namespace Encrypted {
		export function create(
			storage: KeyValueStore<string> | string | platform.KVNamespace,
			algorithms?: cryptly.Algorithms
		): KeyValueStore<string> {
			if (!is(storage))
				storage = open(storage)
			return algorithms
				? KeyValueStore.create(
						Json.create<cryptly.Encrypted>(storage),
						async (value: string) => await algorithms.current.encrypt(value),
						async (value: cryptly.Encrypted) => await algorithms[value.key ?? "current"].decrypt(value)
				  )
				: storage
		}
	}
	export namespace Json {
		export function create<T = any>(storage?: KeyValueStore<string> | string | platform.KVNamespace): KeyValueStore<T> {
			return KeyValueStore.create(
				is(storage) ? storage : open(storage),
				async (value: T) => JSON.stringify(value),
				async (value: string) => JSON.parse(value) as T
			)
		}
	}
}
