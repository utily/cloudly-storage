import { Document } from "../Document"

export type Status<
	T = Record<string, any>,
	S extends [string, string] | [string, string][] = [string, string] | [string, string][]
> = {
	lastArchived?: string
	index?: { changed?: S; id?: S }
	doc?: S extends [string, string] ? T & Document : never
}

export namespace Status {
	export type Options<T extends boolean | undefined = undefined> = {
		id: string
		index?: ["id", "changed"]
		lastArchived?: boolean
		list?: T
		dump?: boolean
	}

	export namespace Options {
		export function is(value: any | Options): value is Options {
			return (
				value &&
				typeof value == "object" &&
				typeof value.id == "string" &&
				(value.index == undefined ||
					(Array.isArray(value.index) && value.index.every((i: any | string) => typeof i == "string"))) &&
				(value.lastArchived == undefined || typeof value.lastArchived == "boolean") &&
				(value.list == undefined || typeof value.list == "boolean")
			)
		}
	}
}
