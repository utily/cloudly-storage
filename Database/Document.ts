import * as isoly from "isoly"
import { Identifier } from "./Identifier"

export interface Document {
	id: Identifier
	created: isoly.DateTime
	changed: isoly.DateTime
	purged?: isoly.Date
}
export namespace Document {
	export function is(value: Document | any, idLength?: Identifier.Length): value is Document {
		return (
			typeof value == "object" &&
			Identifier.is(value.id, idLength) &&
			isoly.DateTime.is(value.created) &&
			isoly.DateTime.is(value.changed) &&
			(value.purged == undefined || isoly.DateTime.is(value.purged))
		)
	}
	export function split<T>(document: Document): [Document, T]
	export function split<T>(document: Partial<Document>): [Partial<Document>, T]
	export function split<T>(document: Partial<Document>): [Partial<Document>, T] {
		const { id, created, changed, purged: purged, ...remainder } = document
		return [{ id, created, changed, purged }, remainder as T]
	}

	export function update<T extends Record<string, any> = Document>(original: T, appendee: Partial<T>): T | undefined {
		return JSON.parse(JSON.stringify({ ...original, ...appendee }))
	}

	export function append<T extends Record<string, any> = Document>(
		originalDoc: T,
		appendee: Partial<T>
	): T | undefined {
		const result: T = { ...originalDoc }
		for (const [key, value] of Object.entries(appendee)) {
			if (Array.isArray(value)) {
				Object.defineProperty(result, key, {
					value: [...(Array.isArray(result[key]) ? result[key] : []), ...value],
					enumerable: true,
					writable: true,
				})
			} else if (typeof value == "object") {
				Object.defineProperty(result, key, {
					value: append<typeof result[typeof key]>(result[key], value),
					enumerable: true,
					writable: true,
				})
			} else {
				Object.defineProperty(result, key, { value, enumerable: true, writable: true })
			}
		}
		return result
	}
}
