import * as isoly from "isoly"

export type Selection =
	| { limit?: number } & (
			| {
					cursor: string
			  }
			| {
					index?: string
					created?: isoly.DateRange
			  }
			| {
					changed: isoly.DateRange
			  }
	  )

export namespace Selection {
	export const standardLimit = 500
	export function is(value: Selection | any): value is Selection {
		return !!type(value) && (value.limit == undefined || typeof value.limit == "number")
	}

	export function type(value: Selection | any): "cursor" | "created" | "changed" | undefined {
		return typeof value != "object"
			? undefined
			: typeof value.cursor == "string"
			? "cursor"
			: isoly.DateRange.is(value.changed)
			? "changed"
			: isoly.DateRange.is(value.created) || value.created == undefined
			? "created"
			: undefined
	}
}
