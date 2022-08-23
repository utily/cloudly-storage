import * as isoly from "isoly"
import { Identifier } from "../Identifier"

export interface Buffer {
	retention?: isoly.DateSpan
	retainChanged?: boolean
	idLength?: Identifier.Length
	shards?: 1 | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256
}

export namespace Buffer {
	export const standard: Required<Buffer> = {
		retention: {},
		idLength: Identifier.Length.standard,
		retainChanged: false,
		shards: 4,
	}
}
