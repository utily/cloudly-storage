import * as cryptly from "cryptly"
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
			| undefined
	  ))
	| undefined

export namespace Selection {
	export function extractPrefix(selection: Selection): isoly.Date[] {
		const result = []
		if (selection && "created" in selection && selection.created.start <= selection.created.end) {
			result.push(selection.created.start)
			while (result.slice(-1)[0] < selection.created.end) {
				result.push(isoly.Date.next(result.slice(-1)[0]))
			}
		} // todo changed
		else
			result.push("")
		return result
	}
	export type Locus = string
	export namespace Locus {
		export function generate(selection: Partial<Selection>): Locus | undefined {
			return selection ? cryptly.Base64.encode(JSON.stringify(selection), "url") : undefined
		}
		export function parse(locus?: Locus | string): Selection | undefined {
			return locus && JSON.parse(new cryptly.TextDecoder().decode(cryptly.Base64.decode(locus, "url")))
		}
	}
}
