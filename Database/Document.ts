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
}
export namespace Document {
	export function split(document: Document): [Document, any] {
		const { id, created, changed, retained, ...remainder } = document
		return [{ id, created, changed, retained }, remainder]
	}
}
