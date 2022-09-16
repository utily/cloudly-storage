import * as cryptly from "cryptly"
import * as isoly from "isoly"
import { Selection } from "./Selection"

export type Cursor = {
	cursor?: string
	type: "doc" | "changed"
	range?: isoly.TimeRange | isoly.DateRange
	limit?: number
}

export namespace Cursor {
	export function serialize(cursor: Cursor): string | undefined {
		return cryptly.Base64.encode(JSON.stringify(cursor), "url")
	}
	export function parse(cursor?: string): Cursor | undefined {
		return cursor && JSON.parse(new cryptly.TextDecoder().decode(cryptly.Base64.decode(cursor, "url")))
	}

	export function prefix(cursor?: Cursor): isoly.Date[] {
		const result: isoly.Date[] = []
		let start = cursor?.range?.start && isoly.DateTime.getDate(cursor?.range?.start)
		const end = cursor?.range?.end && isoly.DateTime.getDate(cursor?.range?.end)
		while (start && end && start <= end) {
			result.push(start)
			start = isoly.Date.next(start)
		}
		return result.length == 0 ? [""] : result
	}

	export function from(selection: Selection | any): Cursor | undefined {
		let result: Cursor | undefined = undefined
		switch (Selection.type(selection)) {
			case "created":
				result = { limit: selection.limit, range: selection.created, type: "doc" }
				break
			case "changed":
				result = { limit: selection.limit, range: selection.changed, type: "changed" }
				break
			case "cursor":
				result = { type: "doc", ...parse(selection.cursor), ...(selection.limit ? { limit: selection.limit } : {}) }
				break
			default:
				break
		}
		return result
	}
}