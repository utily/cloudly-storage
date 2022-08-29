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
	load(selection?: Selection): Promise<(Document & T)[] & { locus?: string }>
	async load(
		selection: Identifier | Identifier[] | Selection
	): Promise<Document | undefined | ((Document & T) | undefined)[] | ((Document & T)[] & { locus?: string })> {
		let result: ((T & Document) | undefined) | ((Document & T)[] & { locus?: string }) | undefined
		switch (typeof selection) {
			case "string":
				const bufferDoc = await this.buffer.load(selection)
				const archiveDoc = await this.archive.load(selection)
				result = bufferDoc ? bufferDoc : archiveDoc
				break
			case "object": //TODO: will return configuration.shards * limit
				let bufferList: (T & Document) | undefined | ((Document & T) | undefined)[]
				let archiveList: (T & Document) | undefined | (((Document & T) | undefined)[] & { locus?: string })
				if (Array.isArray(selection)) {
					bufferList = await this.buffer.load(selection)
					archiveList = await this.archive.load(selection)
				} else {
					const query: Selection.Query = Selection.get(selection)
					bufferList = await this.buffer.load(query)
					const limit =
						(query && "limit" in query && query.limit ? query.limit : Selection.Query.standardLimit) - bufferList.length
					archiveList =
						limit > 1
							? await this.archive.load({
									...query,
									limit,
							  })
							: []
				}
				result = Object.values(
					archiveList.reduce<(T & Document)[]>(
						(r, document) => (document ? { [document.id]: document, ...r } : r),
						bufferList.reduce((r, document) => (document ? { [document.id]: document, ...r } : r), [])
					)
				)
				if (archiveList.locus)
					result.locus = archiveList.locus
				break
			case "undefined": // TODO: Add locus in the buffer.
				const archive: ((Document & T) | undefined)[] & {
					locus?: string | undefined
				} = await this.archive.load()
				const buffer: Record<string, Document & T> = (await this.buffer.load()).reduce(
					(r, e) => ({ [e.id]: e, ...r }),
					{}
				)
				const combined: Record<string, Document & T> = archive.reduce(
					(r, document) => ({ ...(document ? { [document.id]: document } : {}), ...r }),
					buffer
				)
				result = Object.values(combined)
				if (archive.locus)
					result.locus = archive.locus
				break
		}
		return result
	}

	allocateId(document: T & Partial<Document>): Promise<Document & T>
	allocateId(documents: (T & Partial<Document>)[]): Promise<(Document & T)[]>
	allocateId(
		documents: (T & Partial<Document>) | (T & Partial<Document>)[]
	): Promise<(Document & T) | undefined | (Document & T)[]>
	async allocateId(
		documents: (T & Partial<Document>) | (T & Partial<Document>)[]
	): Promise<(Document & T) | undefined | (Document & T)[]> {
		let result: (Document & T) | undefined | (Document & T)[]
		if (!Array.isArray(documents)) {
			const allocated = await this.archive.allocateId({
				...documents,
				created: documents.created ?? isoly.DateTime.now(),
				changed: isoly.DateTime.now(),
			})
			result = allocated
				? {
						...documents,
						...allocated,
				  }
				: undefined
		} else
			result = (await Promise.all(documents.map(d => this.allocateId(d)))).filter(e => e)
		return result
	}
	store(document: T & Partial<Document>): Promise<(T & Document) | undefined>
	store(documents: (T & Partial<Document>)[]): Promise<(T & Document)[]>
	async store(
		documents: (T & Partial<Document>) | (T & Partial<Document>)[]
	): Promise<(T & Document)[] | (T & Document) | undefined> {
		const toBeStored: (T & Document) | (T & Document)[] | undefined = await this.allocateId(documents)
		return toBeStored && (await this.buffer.store(toBeStored))
	}
	async update(incomingDoc: T & Partial<Document> & { id: Document["id"] }): Promise<(T & Document) | undefined> {
		const archiveDocument = await this.archive.load(incomingDoc.id)
		return this.buffer.update({ ...incomingDoc, changed: isoly.DateTime.now() }, archiveDocument)
	}
	remove(id: Identifier): Promise<boolean>
	remove(id: Identifier[]): Promise<boolean[]>
	async remove(ids: Identifier | Identifier[]): Promise<boolean | boolean[]> {
		const buffer = await this.buffer.remove(ids)
		const archive = await this.archive.remove(ids)
		const result = [[buffer].flat(), [archive].flat()].reduce(
			(r, [buffer, archive], i) => [...r, buffer && archive],
			[]
		)
		return Array.isArray(ids) ? result : result.some(e => e == true)
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
