import { Archive } from "./Archive"
import { Buffer } from "./Buffer"

export interface Collection extends Buffer, Archive {
	partitions?: { [key: string]: Collection }
}

export namespace Collection {
	export type Complete = Required<Omit<Collection, "partitions">> & Pick<Collection, "partitions">
	export const standard: Required<Omit<Collection, "partitions">> = {
		...Archive.standard,
		...Buffer.standard,
	}
}
