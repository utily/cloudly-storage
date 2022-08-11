import * as isoly from "isoly"

export type Selection =
	| ({
			cursor?: string
			limit?: number
	  } & (
			| {
					changed: isoly.DateRange
			  }
			| {
					created: isoly.DateRange
			  }
	  ))
	| undefined

export namespace Selection {
	export type Locus = string
	export namespace Locus {
		export function generate(selection: Selection): Locus | undefined {
			return selection
				? encodeURIComponent(
						Object.entries(selection ?? {}).reduce((result, [key, value]) => {
							return key == "created" || key == "changed"
								? `${key}$$${(value as isoly.DateRange)?.start}$$${(value as isoly.DateRange)?.end}`
								: result
						}, "") + (selection.cursor ? "$$" + selection.cursor : "")
				  )
				: undefined
		}
		export function parse(locus: Locus | string): Selection | undefined {
			const decoded = decodeURIComponent(locus).split("$$")
			return decoded[0] == "created" || decoded[0] == "changed"
				? { [decoded[0] as "created"]: { start: decoded[1], end: decoded[2] }, cursor: decoded[3] }
				: undefined
		}
	}
}
