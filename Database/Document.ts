import * as isoly from "isoly"
import { Identifier } from "./Identifier"

export interface Document {
	id: Identifier
	created: isoly.DateTime
	changed: isoly.DateTime
	purged?: isoly.Date
}
// type Key = ({ [k: string]: Key } | string)[]
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
	export function split<T = Record<string, any>>(document: Document): [Document, T]
	export function split<T = Record<string, any>>(document: Partial<Document>): [Partial<Document>, T]
	export function split<T = Record<string, any>>(document: Partial<Document>): [Partial<Document>, T] {
		const { id, created, changed, purged, ...remainder } = document
		return [{ id, created, changed, purged }, remainder as T]
	}
}
