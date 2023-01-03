export interface Error {
	name: string
	message: string
	id?: string
}

export namespace Error {
	export const origin = <const>["Archive", "Buffer", "Collection", "Backend"]
	export type Origin = typeof Error.origin[number]
	export const point = <const>["store", "update", "append", "load", "remove"]
	export type Point = typeof Error.point[number]
	export type Name = `${Origin}.${Point}`
	export function is(value: Error | any): value is Error {
		return (
			value &&
			typeof value == "object" &&
			typeof value.name == "string" &&
			typeof value.message == "string" &&
			(value.id == undefined || typeof value.id == "string")
		)
	}
	export function create(name: Name, error?: any, id?: string): Error {
		return {
			name,
			message:
				error && typeof error == "object" && "message" in error && typeof error.message == "string"
					? error.message
					: typeof error == "string"
					? error
					: "unkown error",
			id,
		}
	}
}
