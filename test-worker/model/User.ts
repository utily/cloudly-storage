import * as isoly from "isoly"

export interface User {
	level: number
	id: string
	groups: string[]
	name: string
	created: isoly.DateTime
}

export namespace User {
	type MetaKeys = "name" | "created" | "id"
	export type Meta = Pick<User, MetaKeys>
	export type Value = Omit<User, MetaKeys>
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
	export function split(user: User): { meta: Meta; value: Value } {
		const { name, created, id, ...value } = user
		console.log("user.name", name)
		console.log("user.created", created)
		console.log("user.id", id)
		console.log("user.value", value)
		return { meta: { name, created, id }, value }
	}
}
