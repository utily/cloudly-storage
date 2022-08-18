import * as isoly from "isoly"

export type Query =
	| {
			cursor?: string
			limit?: number
	  }
	| {
			cursor?: string
			limit?: number
			created: isoly.DateRange
	  }
	| {
			cursor?: string
			limit?: number
			changed: isoly.DateRange
	  }
	| undefined

export namespace Query {
	export function extractPrefix(query: Query | undefined): isoly.Date[] {
		const result = []
		if (query && "created" in query && query.created.start <= query.created.end) {
			result.push(query.created.start)
			while (result.slice(-1)[0] < query.created.end) {
				result.push(isoly.Date.next(result.slice(-1)[0]))
			}
		} // todo changed
		else {
			console.log("this case")
			result.push("")
		}
		return result
	}
}
