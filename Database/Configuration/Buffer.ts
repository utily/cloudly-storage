import * as isoly from "isoly"

export interface Buffer {
	retention?: isoly.DateSpan
	retainChanged?: boolean
	shards?: 1 | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256
}

export namespace Buffer {
	export const standard: Required<Buffer> = {
		retention: {},
		retainChanged: false,
		shards: 4,
	}
}
