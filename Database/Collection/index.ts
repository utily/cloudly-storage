import * as isoly from "isoly"
import { Archive } from "../Archive"
import { Buffer } from "../Buffer"
import { Configuration } from "../Configuration"
import { Document } from "../Document"
import { Identifier } from "../Identifier"
import { Selection } from "../Selection"
import { Silo } from "../Silo"

export class Collection<T = any> extends Silo<T, Collection<T>> {
	private constructor(
		private readonly archive: Archive<T>,
		private readonly buffer: Buffer<T>,
		readonly configuration: Configuration.Collection,
		private readonly partitions = ""
	) {
		super()
	}
	partition(...partition: string[]): Collection<T> {
		return new Collection(
			this.archive.partition(partition.join("/")),
			this.buffer.partition(partition.join("/")),
			this.configuration,
			this.partitions + partition.join("/") + "/"
		)
	}
	load(id: Identifier): Promise<(T & Document) | undefined>
	load(ids?: Identifier[]): Promise<((Document & T) | undefined)[]>
	load(selection?: Selection): Promise<(Document & T)[] & { cursor?: string }>
	async load(
		selection: Identifier | Identifier[] | Selection
	): Promise<Document | undefined | ((Document & T) | undefined)[] | ((Document & T)[] & { cursor?: string })> {
		let result: ((T & Document) | undefined) | ((Document & T)[] & { cursor?: string }) | undefined
		switch (typeof selection) {
			case "string":
				const bufferDoc = await this.buffer.load(selection)
				const archiveDoc = await this.archive.load(selection)
				result = bufferDoc ? bufferDoc : archiveDoc
				break
			case "object":
				// let bufferList: (T & Document) | undefined | (Document & T)[]
				// let archiveList: (T & Document) | undefined | (Document & T)[]
				// if (Array.isArray(selection)) {
				// 	bufferList = await this.buffer.load(selection)
				// 	archiveList = await this.archive.load(selection)
				// } else {
				// 	bufferList = await this.buffer.load(selection)
				// 	archiveList = await this.archive.load(selection)
				// }
				// result = archiveList.reduce<(T & Document)[]>(
				// 	(r, document) => document && { [document.id]: document, ...r },
				// 	bufferList
				// )
				break
			case "undefined":
				const archive: ((Document & T) | undefined)[] = await this.archive.load()
				const buffer: Record<string, Document & T> = (await this.buffer.load()).reduce(
					(r, e) => ({ [e.id]: e, ...r }),
					{}
				)
				const combined: Record<string, Document & T> = archive.reduce(
					(r, document) => ({ ...(document ? { [document.id]: document } : {}), ...r }),
					buffer
				)
				result = Object.values(combined)
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
			? await this.buffer.store({
					...document,
					id: document.id ?? Identifier.generate(),
					created: document.created ?? isoly.DateTime.now(),
					changed: isoly.DateTime.now(),
			  })
			: await Promise.all(document.map(v => this.store(v)))
	}
	async remove(id: Identifier): Promise<boolean>
	async remove(id: Identifier[]): Promise<boolean[]>
	async remove(id: Identifier | Identifier[]): Promise<boolean | boolean[]> {
		return !Array.isArray(id) ? false : Promise.all(id.map(i => this.remove(i)))
	}
	static open<T extends object = any>(
		archive: Archive<T>,
		buffer: Buffer<T>,
		configuration: Required<Configuration.Archive>
	): Collection<T>
	static open<T extends object = any>(
		archive: Archive<T> | undefined,
		buffer: Buffer<T> | undefined,
		configuration: Required<Configuration.Archive>
	): Collection<T> | undefined
	static open<T extends object = any>(
		archive: Archive<T> | undefined,
		buffer: Buffer<T> | undefined,
		configuration: Required<Configuration.Archive> = Configuration.Archive.standard
	): Collection<T> | undefined {
		return archive && buffer && new Collection<T>(archive, buffer, configuration)
	}
}
