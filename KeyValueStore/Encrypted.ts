import * as cryptly from "cryptly"
import * as platform from "../platform"
import { create as kvCreate } from "./create"
import { Json } from "./Json"
import { KeyValueStore } from "./KeyValueStore"
import { open } from "./open"

export namespace Encrypted {
	export function create(
		storage: KeyValueStore<string> | string | platform.KVNamespace,
		algorithms?: cryptly.Algorithms
	): KeyValueStore<string> {
		if (!KeyValueStore.is(storage))
			storage = open(storage)
		return algorithms
			? kvCreate(
					Json.create<cryptly.Encrypted>(storage),
					async (value: string) => await algorithms.current.encrypt(value),
					async (value: cryptly.Encrypted) => await algorithms[value.key ?? "current"].decrypt(value)
			  )
			: storage
	}
}
