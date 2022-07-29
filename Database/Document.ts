import * as isoly from "isoly"
import { Identifier } from "./Identifier"

export interface Document {
	id: Identifier
	created: isoly.DateTime
	changed: isoly.DateTime
	retained?: isoly.Date
}
export namespace Document {
	export function split(document: Document): [Document, any] {
		const { id, created, changed, retained, ...remainder } = document
		return [{ id, created, changed, retained }, remainder]
	}
}
