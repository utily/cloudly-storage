import * as cryptly from "cryptly"
import * as isoly from "isoly"

type ShardCount = 1 | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256

export interface Buffer {
	shards?: ShardCount //number of parallel durable objects.
	reconciliationInterval?: isoly.TimeSpan //time between syncronizing the buffer and the archive.
	reconcileAfter?: isoly.TimeSpan //time to keep a document in buffer before archiving.
	retainChanged?: boolean
	superimposeFor?: isoly.TimeSpan //time documents should be stored in buffer after its beem archived.
	retention?: isoly.TimeSpan
}

export namespace Buffer {
	export type Complete = Required<Omit<Buffer, "retention">> & Pick<Buffer, "retention">
	export const standard: Complete = {
		shards: 4,
		reconciliationInterval: { seconds: 30 },
		reconcileAfter: { minutes: 5 },
		retainChanged: false,
		superimposeFor: { minutes: 5 },
	}
	export function getShard(configuration: Buffer): string[]
	export function getShard(configuration: Buffer, id: string): string
	export function getShard(configuration: Buffer, id: number): string
	export function getShard(configuration: Buffer, id: string[]): Record<string, string[]>
	export function getShard(
		configuration: Buffer,
		id?: number | string | string[]
	): string[] | string | Record<string, string[]> {
		let result: string | Record<string, string[]> | string[]
		if (id == undefined) {
			result = []
			for (let shard = 0; shard < { ...standard, ...configuration }.shards; shard++)
				result.push(getShard(configuration, shard))
		} else if (Array.isArray(id)) {
			result = {}
			for (const i of id) {
				const shard = getShard(configuration, i)
				result[shard] = result[shard]?.concat(i) ?? [i]
			}
		} else {
			const bitsUsed = Math.log2({ ...standard, ...configuration }.shards)
			const mask = 2 ** bitsUsed - 1
			const binary = typeof id == "string" ? cryptly.Identifier.toBinary(id)[0] : id
			result = cryptly.Identifier.fromBinary(new Uint8Array([(binary ?? 0) & mask]))
		}
		return result
	}
}
