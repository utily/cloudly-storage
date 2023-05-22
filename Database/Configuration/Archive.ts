import * as isoly from "isoly"
import { Identifier } from "../Identifier"

export interface Archive {
	idLength?: Identifier.Length
	retention?: isoly.TimeSpan
	index?: string[]
	partitions?: { [key: string]: Archive }
}

export namespace Archive {
	export type Complete = Required<Omit<Archive, "partitions" | "retention" | "index">> &
		Pick<Archive, "partitions" | "retention" | "index">
	export const Complete = {}
	export const standard: Complete = {
		idLength: Identifier.Length.standard,
	}
}
