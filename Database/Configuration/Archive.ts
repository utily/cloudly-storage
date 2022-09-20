import * as isoly from "isoly"
import { Identifier } from "../Identifier"

export interface Archive {
	idLength?: Identifier.Length
	retention?: isoly.DateSpan
	retainChanged?: boolean
	partitions?: { [key: string]: Archive }
}

export namespace Archive {
	export type Complete = Required<Omit<Archive, "partitions">> & Pick<Archive, "partitions">
	export const Complete = {}
	export const standard: Complete = {
		retention: {},
		idLength: Identifier.Length.standard,
		retainChanged: false,
	}
}
