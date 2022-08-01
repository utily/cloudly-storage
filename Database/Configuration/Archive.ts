import * as isoly from "isoly"
import { Identifier } from "../Identifier"

export interface Archive {
	idLength?: Identifier.Length
	retention?: isoly.DateSpan
	retainChanged?: boolean
}

export namespace Archive {
	export const standard: Required<Archive> = {
		retention: {},
		idLength: Identifier.Length.standard,
		retainChanged: false,
	}
}
