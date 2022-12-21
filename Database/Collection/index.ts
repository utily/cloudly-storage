import * as isoly from "isoly"
import { Archive } from "../Archive"
import { Buffer } from "../Buffer"
import { Configuration } from "../Configuration"
import { Cursor } from "../Cursor"
import { Document } from "../Document"
import { Identifier } from "../Identifier"
import { Selection } from "../Selection"
import { Silo } from "../Silo"

export class Collection<T = any> extends Silo<T, Collection<T>> {
	private constructor(
		private readonly archive: Archive<T>,
		private readonly buffer: Buffer<T>,
		readonly configuration: Configuration.Collection.Complete,
		private readonly partitions = ""
	) {
		super()
	}
	partition(...partition: string[]): Collection<T> {
		return new Collection(
			this.archive.partition(partition.join("/")),
			this.buffer.partition(partition.join("/")),
			partition.reduce(
				(r: Configuration.Collection.Complete, e) => ({ ...r, partitions: undefined, ...(r.partitions?.[e] ?? {}) }),
				this.configuration
			),
			this.partitions + partition.join("/") + "/"
		)
	}
	load(id: Identifier, options?: { lock?: isoly.TimeSpan }): Promise<(T & Document) | undefined>
	load(ids?: Identifier[]): Promise<((Document & T) | undefined)[]>
	load(selection?: Selection): Promise<(Document & T)[] & { cursor?: string }>
	async load(
		selection?: Identifier | Identifier[] | Selection,
		options?: { lock?: isoly.TimeSpan }
	): Promise<Document | undefined | ((Document & T) | undefined)[] | ((Document & T)[] & { cursor?: string })> {
		let result: ((T & Document) | undefined) | ((Document & T)[] & { cursor?: string }) | undefined
		switch (typeof selection) {
			case "string":
				const bufferDoc = await this.buffer.load(selection, options)
				const archiveDoc = await this.archive.load(selection)
				result = bufferDoc?.id == "locked" ? undefined : bufferDoc ? bufferDoc : archiveDoc
				break
			case "object": //TODO: will return configuration.shards * limit
				let bufferList: (T & Document) | undefined | ((Document & T) | undefined)[]
				let archiveList: (T & Document) | undefined | (((Document & T) | undefined)[] & { cursor?: string })
				if (Array.isArray(selection)) {
					bufferList = await this.buffer.load(selection, options)
					archiveList = await this.archive.load(selection)
				} else {
					const cursor: Cursor | undefined = Cursor.from(selection)
					bufferList = await this.buffer.load(cursor)
					const limit =
						(cursor && "limit" in cursor && cursor.limit ? cursor.limit : Selection.standardLimit) - bufferList?.length
					archiveList =
						limit > 1
							? await this.archive.load({
									...selection,
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
				if (archiveList.cursor)
					result.cursor = archiveList.cursor
				break
			case "undefined": // TODO: Add cursor in the buffer.
				const buffer: Record<string, Document & T> = (await this.buffer.load()).reduce(
					(r, e) => ({ [e.id]: e, ...r }),
					{}
				)
				const archive: ((Document & T) | undefined)[] & {
					cursor?: string | undefined
				} = await this.archive.load()
				const combined: Record<string, Document & T> = archive.reduce(
					(r, document) => ({ ...(document ? { [document.id]: document } : {}), ...r }),
					buffer
				)
				result = Object.values(combined)
				if (archive.cursor)
					result.cursor = archive.cursor
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
			const allocated = await this.archive.allocateId(documents)
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
	async update(
		amendment: Partial<T & Document> & Pick<Document, "id">,
		unlock?: true
	): Promise<(T & Document) | undefined>
	async update(
		amendments: (Partial<T & Document> & Pick<Document, "id">)[],
		unlock?: true
	): Promise<((T & Document) | undefined)[]>
	async update(
		amendments: (Partial<T & Document> & Pick<Document, "id">) | (Partial<T & Document> & Pick<Document, "id">)[],
		unlock?: true
	): Promise<(T & Document) | undefined | ((T & Document) | undefined)[]> {
		return this.change(amendments, "update", unlock)
	}
	async append(
		amendment: Partial<T & Document> & Pick<Document, "id">,
		unlock?: true
	): Promise<(T & Document) | undefined>
	async append(
		amendments: (Partial<T & Document> & Pick<Document, "id">)[],
		unlock?: true
	): Promise<((T & Document) | undefined)[]>
	async append(
		amendments: (Partial<T & Document> & Pick<Document, "id">) | (Partial<T & Document> & Pick<Document, "id">)[],
		unlock?: true
	): Promise<(T & Document) | undefined | ((T & Document) | undefined)[]> {
		return this.change(amendments, "append", unlock)
	}
	private async change(
		amendments: (Partial<T & Document> & Pick<Document, "id">) | (Partial<T & Document> & Pick<Document, "id">)[],
		type: "append" | "update",
		unlock?: true
	): Promise<(T & Document) | undefined | ((T & Document) | undefined)[]> {
		let result: (T & Document) | undefined | ((T & Document) | undefined)[]
		if (Array.isArray(amendments)) {
			const changes: Record<string, Partial<T & Document> & Pick<Document, "id">> = {}
			const archived: Record<string, (T & Document) | undefined> = {}
			for await (const amendment of amendments) {
				const loaded = await this.archive.load(amendment.id)
				changes[amendment.id] =
					(loaded ? amendment : await this.allocateId(amendment as any as T & Document)) ?? amendment
				archived[amendment.id] = loaded ? loaded : undefined
			}
			result = await this.buffer.change(changes, archived, type, unlock)
		} else {
			const archived = await this.archive.load(amendments.id)
			amendments = (archived ? amendments : await this.allocateId(amendments as any as T & Document)) ?? amendments
			result = await this.buffer.change({ [amendments.id]: amendments }, { [amendments.id]: archived }, type, unlock)
		}
		return result
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
		configuration: Configuration.Collection
	): Collection<T>
	static open<T extends object = any>(
		archive: Archive<T> | undefined,
		buffer: Buffer<T> | undefined,
		configuration: Configuration.Collection
	): Collection<T> | undefined
	static open<T extends object = any>(
		archive: Archive<T> | undefined,
		buffer: Buffer<T> | undefined,
		configuration: Configuration.Collection = Configuration.Collection.standard
	): Collection<T> | undefined {
		return (
			archive &&
			buffer &&
			new Collection<T>(archive, buffer, { ...Configuration.Collection.standard, ...configuration })
		)
	}
}
