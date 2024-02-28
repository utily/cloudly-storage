import { isoly } from "isoly"
import { Identifier } from "../Identifier"

export interface Archive {
	idLength?: Identifier.Length
	retention?: isoly.TimeSpan
	index?: string[]
	partitions?: { [key: string]: Archive }
	meta?: { split: (value: any) => { meta: any; value: any }; is: (value: any) => boolean }
}

export namespace Archive {
	export type Complete = Required<Omit<Archive, "partitions" | "retention" | "index" | "meta">> &
		Pick<Archive, "partitions" | "retention" | "index" | "meta">
	export const Complete = {}
	export const standard: Complete = {
		idLength: Identifier.Length.standard,
	}
}
