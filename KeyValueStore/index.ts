import * as cryptly from "cryptly"
import * as isoly from "isoly"
import * as platform from "../platform"
import { FromPlatform } from "./FromPlatform"
import { InMemory } from "./InMemory"
import { KeyValueStore as Interface } from "./KeyValueStore"

export type KeyValueStore<V = unknown, M extends Record<string, unknown> = Record<string, unknown>> = Interface<V, M>

export namespace KeyValueStore {
	export function create<V, B, M extends Record<string, unknown> = Record<string, unknown>>(
		backend: Interface<B, M>,
		to: (value: V) => Promise<B>,
		from: (value: B) => Promise<V>
	): Interface<V, M> {
		return {
			set: async (key: string, value: V, options: { expires?: isoly.DateTime; meta?: M }): Promise<void> => {
				await backend.set(key, await to(value), options)
			},
			get: async (key: string): Promise<{ value: V; expires?: isoly.DateTime; meta?: M } | undefined> => {
				const result = await backend.get(key)
				return result && { ...result, value: await from(result.value) }
			},
			list: async (
				prefix: string
			): Promise<{ data: { key: string; value: V; expires?: isoly.DateTime; meta?: M }[]; cursor?: string }> => {
				const result = await backend.list(prefix)
				return { data: await Promise.all(result.data.map(async item => ({ ...item, value: await from(item.value) }))) }
			},
		}
	}
	export function open<V extends string | ArrayBuffer | ReadableStream = string | ArrayBuffer | ReadableStream>(
		namespace?: string | platform.KeyValueStore
	): Interface<V> {
		return typeof namespace != "object" ? InMemory.open<V>(namespace) : new FromPlatform<V>(namespace)
	}
	export function exists(namespace?: string | platform.KeyValueStore): boolean {
		return typeof namespace != "object" && InMemory.exists(namespace)
	}
	export namespace Encrypted {
		export function create(storage: KeyValueStore<string>, algorithms?: cryptly.Algorithms): KeyValueStore<string> {
			return algorithms
				? KeyValueStore.create(
						storage,
						async (value: string) => JSON.stringify(await algorithms.current.encrypt(value)),
						async (value: string) => {
							const encrypted = JSON.parse(value) as cryptly.Encrypted
							return await algorithms[encrypted.key ?? "current"].decrypt(encrypted)
						}
				  )
				: storage
		}
	}
}
