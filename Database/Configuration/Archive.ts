import * as isoly from "isoly"
import { Identifier } from "../Identifier"

export interface Archive {
	idLength?: Identifier.Length
	retention?: isoly.TimeSpan
	retainChanged?: boolean
	partitions?: { [key: string]: Archive }
}

export namespace Archive {
	export type Complete = Required<Omit<Archive, "partitions" | "retention">> & Pick<Archive, "partitions" | "retention">
	export const Complete = {}
	export const standard: Complete = {
		idLength: Identifier.Length.standard,
		retainChanged: false,
	}
}
