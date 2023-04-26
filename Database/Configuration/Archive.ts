import * as isoly from "isoly"
import { Identifier } from "../Identifier"

export interface Archive {
	idLength?: Identifier.Length
	retention?: isoly.TimeSpan
	retainChanged?: boolean
	index?: string[]
	partitions?: { [key: string]: Archive }
	meta?: string[]
}

export namespace Archive {
	export type Complete = Required<Omit<Archive, "partitions" | "retention" | "index" | "meta">> &
		Pick<Archive, "partitions" | "retention" | "index" | "meta">
	export const Complete = {}
	export const standard: Complete = {
		idLength: Identifier.Length.standard,
		retainChanged: false,
	}
}
