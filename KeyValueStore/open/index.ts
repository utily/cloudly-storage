import * as platform from "../../platform"
import { FromPlatform } from "../FromPlatform"
import { InMemory } from "../InMemory"
import { KeyValueStore as Interface } from "../KeyValueStore"

export function open<V extends string = string, M = any>(
	namespace?: string | platform.KVNamespace,
	type?: "text"
): Interface<V, M>
export function open<V extends ArrayBuffer = ArrayBuffer, M = any>(
	namespace: string | platform.KVNamespace | undefined,
	type: "arrayBuffer"
): Interface<V, M>
export function open<V extends ReadableStream = ReadableStream, M = any>(
	namespace: string | platform.KVNamespace | undefined,
	type: "stream"
): Interface<V, M>
export function open<V extends string | ArrayBuffer | ReadableStream = string, M extends object = any>(
	namespace?: string | platform.KVNamespace,
	type: "text" | "arrayBuffer" | "stream" = "text"
): Interface<V, M> {
	return typeof namespace != "object" ? InMemory.open<V, M>(namespace) : new FromPlatform<V, M>(namespace, type)
}
