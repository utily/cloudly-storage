import { Archive } from "./Archive"
import { Buffer } from "./Buffer"

export interface Collection extends Buffer, Archive {
	partitions?: { [key: string]: Collection }
}

export namespace Collection {
	export type Complete = Buffer.Complete & Archive.Complete
	export const standard: Complete = {
		...Archive.standard,
		...Buffer.standard,
	}
}
