import * as isoly from "isoly"
import { Buffer } from "../Buffer"
import { Configuration } from "../Configuration"
import { Document } from "../Document"
import { Identifier } from "../Identifier"
import { Store } from "../Store"

type Selection =
	| {
			changed: isoly.TimeRange
	  }
	| {
			cursor: string
	  }
	| {
			created: isoly.TimeRange
	  }
	| undefined

export class Collection<T> {
	constructor(
		readonly name: string,
		private readonly buffer: Buffer,
		private readonly storage: Store,
		readonly configuration: Configuration.Collection
	) {}
	async load(id: Identifier): Promise<(T & Document) | undefined>
	async load(selection?: Selection): Promise<((Document & T)[] & { cursor?: string }) | undefined>
	async load(
		selection?: Selection | Identifier
	): Promise<((T & Document) | undefined) | ((Document & T)[] & { cursor?: string }) | undefined> {
		let result: ((T & Document) | undefined) | ((Document & T)[] & { cursor?: string }) | undefined
		switch (typeof selection) {
			case "string":
				result = undefined // not found
				break
			case "object":
				result = "changed" in selection ? [] : "cursor" in selection ? [] : "created" in selection ? [] : []
				break
			case "undefined":
				result = []
				result.cursor = "cont"
				break
		}
		return result
	}
	async store(value: T & Partial<Document>): Promise<(T & Document) | undefined>
	async store(values: (T & Partial<Document>)[]): Promise<((T & Document) | undefined)[]>
	async store(
		value: (T & Partial<Document>) | (T & Partial<Document>)[]
	): Promise<(T & Partial<Document>) | undefined | ((T & Document) | undefined)[]> {
		return !Array.isArray(value)
			? {
					...value,
					id: value.id ?? Identifier.generate(),
					created: value.created ?? isoly.DateTime.now(),
					changed: isoly.DateTime.now(),
			  }
			: Promise.all(value.map(v => this.store(v)))
	}
	async remove(id: Identifier): Promise<boolean>
	async remove(id: Identifier[]): Promise<boolean[]>
	async remove(id: Identifier | Identifier[]): Promise<boolean | boolean[]> {
		return !Array.isArray(id) ? false : Promise.all(id.map(i => this.remove(i)))
	}
}
