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
	export function split<T extends Record<string, any>, D extends Document | Partial<Document>>(
		splitter?: (document: D & T) => { meta: any; value: any }
	): (document: D & T) => [D, T] {
		return (document: D & T) => {
			const { meta, value } = splitter ? splitter(document) : { meta: undefined, value: undefined }
			const { id, created, changed, purged, ...remainder } = value ?? document
			const result: [D, T] = [{ id, created, changed, purged, ...meta }, remainder as T]
			return result
		}
	}
}
