import * as isoly from "isoly"

export type Selection =
	| ((
			| {
					changed: isoly.DateRange
			  }
			| {
					created: isoly.DateRange
			  }
	  ) & {
			cursor?: string
			limit?: number
	  })
	| undefined
