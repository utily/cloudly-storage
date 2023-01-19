import { create as kvCreate } from "./create"
import { Encrypted as KVEncrypted } from "./Encrypted"
import { exists as kvExists } from "./exists"
import { InMeta as KVInMeta } from "./InMeta"
import { Json as KVJson } from "./Json"
import { KeyValueStore as Interface } from "./KeyValueStore"
import { ListItem as KVListItem } from "./ListItem"
import { ListOptions as KVListOptions } from "./ListOptions"
import { OnlyMeta as KVOnlyMeta } from "./OnlyMeta"
import { open as kvOpen } from "./open"
import { partition as kvPartition } from "./partition"
import { rangeList as kvRangeList } from "./rangeList"

export type KeyValueStore<V = any, M = undefined> = Interface<V, M>

export namespace KeyValueStore {
	export const is = Interface.is
	export const create = kvCreate
	export const Encrypted = KVEncrypted
	export const exists = kvExists
	export const InMeta = KVInMeta
	export const Json = KVJson
	export const ListOptions = KVListOptions
	export type ListOptions = KVListOptions
	export type ListItem<V, M> = KVListItem<V, M>
	export const OnlyMeta = KVOnlyMeta
	export const open = kvOpen
	export const partition = kvPartition
	export const rangeList = kvRangeList
}
