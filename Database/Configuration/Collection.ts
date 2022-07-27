import * as cryptly from "cryptly"
import * as isoly from "isoly"
import { Identifier } from "../Identifier"

type ShardCount = 1 | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256

export interface Collection {
	identifierLength?: Identifier.Length
	shards?: ShardCount
	retention?: isoly.DateSpan
}

export namespace Collection {
	export const standard: Required<Collection> = {
		shards: 4,
		retention: {},
		identifierLength: Identifier.Length.standard,
	}
	export function get(configuration: Collection): string[]
	export function get(configuration: Collection, id: string): string
	export function get(configuration: Collection, id: string[]): Record<string, string[]>
	export function get(configuration: Collection, id?: string | string[]): string[] | string | Record<string, string[]> {
		let result: string | Record<string, string[]> | string[]
		if (!id) {
			result = []
			for (let shard = 0; shard < { ...standard, ...configuration }.shards; shard++)
				result.push(get(configuration, shard.toString()))
		} else if (typeof id == "string") {
			const bitsUsed = Math.log2({ ...standard, ...configuration }.shards)
			const mask = 2 ** bitsUsed - 1
			result = cryptly.Identifier.fromBinary(new Uint8Array([cryptly.Identifier.toBinary(id)[0] ?? 0 & mask]))
		} else {
			result = {}
			for (const i of id) {
				const shard = get(configuration, i)
				result[shard] = result[shard]?.concat(i) ?? [i]
			}
		}
		return result
	}
}
