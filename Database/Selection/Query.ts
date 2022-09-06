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
	export const standardLimit = 1000
	export function extractPrefix(query: Query): isoly.Date[] & { type?: "changed" | "created" } {
		const result: isoly.Date[] & { type?: "changed" | "created" } = []
		let dateRange
		let type: "changed" | "created" | undefined
		if (query && "changed" in query) {
			dateRange = query.changed
			type = "changed"
		} else if (query && "created" in query) {
			dateRange = query.created
			type = "created"
		}
		if (dateRange && dateRange.start <= dateRange.end) {
			result.push(dateRange.start)
			while (result.slice(-1)[0] < dateRange.end) {
				result.push(isoly.Date.next(result.slice(-1)[0]))
			}
			result.type = type
		} else {
			result.push("")
		}
		return result
	}
}
