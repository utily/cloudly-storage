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

	export function update(
		original: Record<string, any>,
		appendee: Partial<Record<string, any>>
	): Record<string, any> | undefined {
		return Object.entries({ ...original, ...appendee }).reduce(
			(r, [key, value]) => (value == undefined ? r : { ...r, [key]: value }),
			{}
		)
	}

	export function append<T extends Document & Record<string, any> = Document>(
		originalDoc: T,
		apendee: Partial<T>
	): T | undefined {
		const result = { ...originalDoc }
		for (const [key, value] of Object.entries(apendee)) {
			if (Array.isArray(value)) {
				Object.defineProperty(result, key, { value: [...(Array.isArray(result[key]) ? result[key] : []), ...value] })
			} else if (typeof value == "object") {
				Object.defineProperty(result, key, { value: append<typeof result[typeof key]>(result[key], value) })
			} else {
				console.log("Key is: ", key)
				console.log("Value is: ", value)
				Object.defineProperty(result, key, { value })
			}
		}
		return result
	}
}
