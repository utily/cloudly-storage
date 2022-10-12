import * as cryptly from "cryptly"
import * as isoly from "isoly"
import { Selection } from "../Selection"

export type Base = {
	type: "doc" | "changed"
	start?: isoly.Date | isoly.DateTime
	end?: isoly.Date | isoly.DateTime
	limit?: number
}

export namespace Base {
	export function from(selection?: Selection | any): (Base & Record<string, any>) | undefined {
		let result: Base | undefined = undefined
		switch (Selection.type(selection)) {
			case "created":
				result = {
					limit: selection.limit,
					start: selection.created?.start,
					end: selection.created?.end,
					type: "doc",
				}
				break
			case "changed":
				result = {
					limit: selection.limit,
					start: selection.changed?.start,
					end: selection.changed?.end,
					type: "changed",
				}
				break
			case "cursor":
				const parsed = parse(selection.cursor)
				result = {
					type: "doc",
					...parsed,
					limit: selection.limit ?? parsed?.limit,
				}
				break
			case undefined:
				result = {
					type: "doc",
				}
				break
			default:
				break
		}
		result &&
			(result.limit =
				!(typeof result.limit == "number") || !result.limit || result.limit > Selection.standardLimit
					? Selection.standardLimit
					: result.limit)
		return result
	}

	export function to(value?: Base | Record<string, any>): Base | undefined {
		return value ? { type: value?.type, start: value?.start, end: value?.end, limit: value?.limit } : undefined
	}

	export function serialize<T = Base>(cursor: T): string | undefined {
		return cryptly.Base64.encode(JSON.stringify(cursor), "url")
	}

	export function parse<T = Base>(cursor?: string): T | undefined {
		return cursor && JSON.parse(new cryptly.TextDecoder().decode(cryptly.Base64.decode(cursor, "url")))
	}
}
