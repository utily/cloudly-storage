import * as isoly from "isoly"

export type Selection =
	| {
			changed: isoly.DateRange
	  }
	| {
			cursor: string
	  }
	| {
			created: isoly.DateRange
	  }
