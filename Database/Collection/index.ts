import * as isoly from "isoly"
import { Error } from "../../Error"
import { Archive } from "../Archive"
import { Buffer } from "../Buffer"
import { Status } from "../Buffer/Status"
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

	status(options: Status.Options): Promise<Status<T, [string, string]> | Error>
	status(options: Status.Options<boolean>): Promise<Status<T, [string, string][]> | Error>
	async status(
		options: Status.Options<boolean | undefined>
	): Promise<Status<T, [string, string] | [string, string][]> | Error> {
		return await this.buffer.status(options)
	}

	load(id: Identifier, options?: { lock?: isoly.TimeSpan }): Promise<(T & Document) | undefined | Error>
	load(ids?: Identifier[]): Promise<((Document & T) | undefined)[] | Error>
	load(selection?: Selection): Promise<((Document & T)[] & { cursor?: string }) | Error>
	async load(
		selection?: Identifier | Identifier[] | Selection,
		options?: { lock?: isoly.TimeSpan }
	): Promise<Document | undefined | ((Document & T) | undefined)[] | ((Document & T)[] & { cursor?: string }) | Error> {
		let result: (T & Document) | ((Document & T)[] & { cursor?: string }) | Error
		switch (typeof selection) {
			case "string":
				const [bufferDoc, archiveDoc] = await Promise.all([
					this.buffer.load(selection, options),
					this.archive.load(selection),
				])
				result = Error.is(bufferDoc) && archiveDoc ? archiveDoc : bufferDoc
				break
			case "object": //TODO: will return configuration.shards * limit
				let bufferList: (T & Document) | Error | ((Document & T) | undefined)[]
				let archiveList: (T & Document) | Error | (((Document & T) | undefined)[] & { cursor?: string }) = []
				let archiveRecord: Record<string, Document & T> | undefined
				if (Array.isArray(selection)) {
					bufferList = await this.buffer.load(selection, options)
					archiveList = Error.is(bufferList) ? bufferList : await this.archive.load(selection)
				} else {
					const cursor: Cursor | undefined = Cursor.from(selection)
					bufferList = !cursor?.cursor ? await this.buffer.load(cursor) : []
					if (!Error.is(bufferList)) {
						const limit = (cursor?.limit ?? Selection.standardLimit) - bufferList?.length
						archiveList =
							limit > 1
								? await this.archive.load({
										...selection,
										limit,
								  })
								: []
						archiveRecord = archiveList.reduce<Record<string, Document & T>>(
							(r, document) => (document ? { [document.id]: document, ...r } : r),
							{}
						)
						if (this.configuration.index?.includes(cursor?.type ?? "")) {
							const bufferUpdates = await this.buffer.load(Object.keys(archiveRecord))
							!Error.is(bufferUpdates) && bufferList.concat(bufferUpdates)
						}
					}
				}
				if (Error.is(archiveList)) {
					result = archiveList
				} else if (Error.is(bufferList)) {
					result = bufferList
				} else {
					const bufferListObj = bufferList.reduce<Record<string, Document & T>>(
						(r, document) => (document ? { [document.id]: document, ...r } : r),
						{}
					)
					result = Object.values({ ...(archiveRecord ?? {}), ...bufferListObj })
					if (archiveList.cursor)
						result.cursor = archiveList.cursor
				}
				break
			case "undefined": // TODO: Add cursor in the buffer.
				const buffer = await this.buffer.load()
				if (!Error.is(buffer)) {
					const archive = await this.archive.load()
					if (!Error.is(archive)) {
						const bufferList: Record<string, Document & T> = buffer.reduce((r, e) => ({ [e.id]: e, ...r }), {})
						const combined: Record<string, Document & T> = archive.reduce(
							(r, document) => ({ ...(document ? { [document.id]: document } : {}), ...r }),
							bufferList
						)
						result = Object.values(combined)
						if (archive.cursor)
							result.cursor = archive.cursor
					} else
						result = archive
				} else
					result = buffer
				break
		}
		return result
	}

	allocateId(document: T & Partial<Document>): Promise<(Document & T) | undefined>
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
			result = (await Promise.all(documents.map(d => this.allocateId(d)))).filter(e => !!e) as (Document & T)[]
		return result
	}
	error(point: Error.Point, error?: any, id?: string): Error {
		return Error.create(`Collection.${point}`, error, id)
	}
	store(document: T & Partial<Document>): Promise<(T & Document) | Error>
	store(documents: (T & Partial<Document>)[]): Promise<(T & Document)[] | Error>
	async store(
		documents: (T & Partial<Document>) | (T & Partial<Document>)[]
	): Promise<(T & Document)[] | (T & Document) | Error> {
		let result: (T & Document)[] | (T & Document) | Error
		try {
			const toBeStored: (T & Document) | (T & Document)[] | undefined = await this.allocateId(documents)
			result = (toBeStored && (await this.buffer.store(toBeStored))) ?? this.error("store", "Unable to store document")
		} catch (e) {
			result = this.error("store", e)
		}
		return result
	}
	update(
		document: T & Partial<Document> & Pick<Document, "id">,
		index?: string,
		unlock?: true
	): Promise<(T & Document) | Error>
	update(
		documents: (T & Partial<Document> & Pick<Document, "id">)[],
		index?: string,
		unlock?: true
	): Promise<(T & Document)[] | Error>
	async update(
		documents: (T & Partial<Document> & Pick<Document, "id">) | (T & Partial<Document> & Pick<Document, "id">)[],
		index?: string,
		unlock?: true
	): Promise<((T & Document) | Error)[] | (T & Document) | Error> {
		let result: (T & Document) | Error | ((T & Document) | Error)[]
		try {
			result = await this.change(documents, index, unlock)
		} catch (e) {
			result = this.error("update", e)
		}
		return result
	}

	private async change(
		amendments: (T & Partial<Document> & Pick<Document, "id">) | (T & Partial<Document> & Pick<Document, "id">)[],
		index?: string,
		unlock?: true
	): Promise<(T & Document) | Error | ((T & Document) | Error)[]> {
		let result: Error | ((T & Document) | Error)[] = []
		const changeList = Array.isArray(amendments) ? amendments : [amendments]
		const changes: Record<string, Partial<T & Document> & Pick<Document, "id">> = {}
		for await (const amendment of changeList) {
			const allocated = await this.allocateId(amendment)
			const old = await this.archive.load(amendment.id)
			changes[amendment.id] = {
				...amendment,
				created: old?.created ?? allocated?.created ?? amendment.created ?? isoly.DateTime.now(),
				changed: (this.configuration.retainChanged && amendment.changed) ?? isoly.DateTime.now(),
			}
			await this.archive.index(changes[amendment.id], index)
		}
		result = Error.is(result) ? result : await this.buffer.udpate(changes, index, unlock)
		return !Array.isArray(amendments) && !Error.is(result) ? result[0] : result
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
