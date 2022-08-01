import * as isoly from "isoly"
import { Archive } from "../Archive"
import { Buffer } from "../Buffer"
import { Configuration } from "../Configuration"
import { Document } from "../Document"
import { Identifier } from "../Identifier"
import { Selection } from "../Selection"

export class Collection<T> {
	constructor(
		readonly name: string,
		private readonly buffer: Buffer,
		private readonly storage: Archive<T>,
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
	async store(document: T & Partial<Document>): Promise<(T & Document) | undefined>
	async store(documents: (T & Partial<Document>)[]): Promise<((T & Document) | undefined)[]>
	async store(
		document: (T & Partial<Document>) | (T & Partial<Document>)[]
	): Promise<(T & Partial<Document>) | undefined | ((T & Document) | undefined)[]> {
		return !Array.isArray(document)
			? {
					...document,
					id: document.id ?? Identifier.generate(),
					created: document.created ?? isoly.DateTime.now(),
					changed: isoly.DateTime.now(),
			  }
			: Promise.all(document.map(v => this.store(v)))
	}
	async remove(id: Identifier): Promise<boolean>
	async remove(id: Identifier[]): Promise<boolean[]>
	async remove(id: Identifier | Identifier[]): Promise<boolean | boolean[]> {
		return !Array.isArray(id) ? false : Promise.all(id.map(i => this.remove(i)))
	}
}
