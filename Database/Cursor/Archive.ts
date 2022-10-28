import * as isoly from "isoly"
import { Selection } from "../Selection"
import { Base } from "./Base"

export type Archive = Base & {
	cursor?: string
}
export namespace Archive {
	export function serialize(cursor: Archive): string | undefined {
		return Base.serialize(cursor)
	}
	export function parse(cursor?: string): Archive | undefined {
		const parsed = Base.parse<Archive>(cursor)
		const base = Base.to(parsed)
		return base ? { ...base, cursor: parsed?.cursor } : undefined
	}
	export function prefix(cursor?: Archive): isoly.Date[] {
		const result: isoly.Date[] = []
		let start = cursor?.start && isoly.DateTime.getDate(cursor?.start)
		const end = cursor?.end && isoly.DateTime.getDate(cursor?.end)
		while (start && end && start <= end) {
			result.push(start)
			start = isoly.Date.next(start)
		}
		return result.length == 0 ? [""] : result
	}
	export function from(selection: Selection | any): Archive | undefined {
		let result: Archive | undefined = undefined
		switch (Selection.type(selection)) {
			case "created":
			case "changed":
				result = Base.from(selection)
				break
			case "cursor":
				const parsed = parse(selection.cursor)
				result = {
					type: "doc",
					...parsed,
					cursor: parsed?.cursor == "newDay" ? undefined : parsed?.cursor,
					...(selection.limit && selection.limit < Selection.standardLimit ? { limit: selection.limit } : {}),
				}
				break
			default:
				break
		}
		return result
	}
}
