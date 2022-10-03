import * as isoly from "isoly"

export interface User {
	level: number
	id: string
	groups: string[]
	name: string
	created: isoly.DateTime
}

export namespace User {
	export function is(value: User | any): value is User {
		return !!(
			value &&
			typeof value == "object" &&
			typeof value.level == "number" &&
			value.id &&
			typeof value.id == "string" &&
			Array.isArray(value.groups) &&
			value.groups.every((e: any) => typeof e == "string") &&
			value.name &&
			typeof value.name == "string" &&
			(value.created == undefined || isoly.DateTime.is(value.created))
		)
	}
}
