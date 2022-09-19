import * as isoly from "isoly"
import * as platform from "../../platform"
import { create as kvCreate } from "../create"
import { KeyValueStore } from "../KeyValueStore"
import { open } from "../open"
export namespace Json {
	export function create<V = any, M = any>(
		store?: KeyValueStore<string, M> | string | platform.KVNamespace,
		retention?: isoly.TimeSpan
	): KeyValueStore<V, M> {
		return kvCreate<string, V, M>(
			KeyValueStore.is(store) ? store : open(store, "text"),
			async (value: V) => JSON.stringify(value),
			async (value: string) => JSON.parse(value) as V
		)
	}
}
