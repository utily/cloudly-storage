import { Archive } from "./Archive"
import { Buffer } from "./Buffer"

type ShardCount = 1 | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256

export interface Collection extends Archive {
	shards?: ShardCount
}

export namespace Collection {
	export const standard: Required<Collection> = {
		...Buffer.standard,
		...Archive.standard,
		shards: 4,
	}
}
