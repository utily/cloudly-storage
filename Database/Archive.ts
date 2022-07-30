import * as isoly from "isoly"
import { KeyValueStore } from "../KeyValueStore"
import { Configuration } from "./Configuration"
import { Document } from "./Document"
import { Identifier } from "./Identifier"
import { Selection } from "./Selection"
import { Silo } from "./Silo"

type Key = `${string}${isoly.DateTime}/${Identifier}`

export class Archive<T = any> extends Silo<T, Archive<T>> {
	private constructor(
		private readonly backend: { doc: KeyValueStore<T, Document>; id: KeyValueStore<"", { key: Key }> },
		private readonly configuration: Required<Configuration.Archive>,
		private readonly partitions: string = ""
	) {
		super()
	}
	private generateKey(document: Pick<Document, "id" | "created">): Key {
		return `${this.partitions}${document.created}/${document.id}`
	}
	private async getKey(id: string) {
		return (await this.backend.id.get(id))?.meta?.key
	}
	async allocateId(document?: Identifier | Partial<Document>): Promise<Document | undefined> {
		if (typeof document != "object")
			document = { id: document }
		if (document.created == undefined)
			document = { ...document, created: isoly.DateTime.now() }
		if (document.changed == undefined)
			document = { ...document, changed: document.created }
		let result =
			(document.id != undefined && !Identifier.is(document.id, this.configuration.idLength)) ||
			!isoly.DateTime.is(document.created) ||
			!isoly.DateTime.is(document.changed)
				? undefined
				: {
						id: document.id ?? Identifier.generate(this.configuration.idLength),
						created: document.created,
						changed: document.changed,
				  }
		if (result && !(await this.backend.id.get(result.id)))
			await this.backend.id.set(result.id, "", { meta: { key: this.generateKey(result) } })
		else
			result = document.id == undefined ? await this.allocateId(document) : undefined
		return result
	}
	load(id: Identifier): Promise<(T & Document) | undefined>
	load(ids: Identifier[]): Promise<((Document & T) | undefined)[]>
	load(selection?: Selection): Promise<(Document & T)[] & { cursor?: string }>
	async load(
		selection: Identifier | Identifier[] | Selection
	): Promise<Document | undefined | ((Document & T) | undefined)[] | ((Document & T)[] & { cursor?: string })> {
		let result: Document | undefined | ((Document & T) | undefined)[] | ((Document & T)[] & { cursor?: string })
		if (typeof selection == "string") {
			const key = await this.getKey(selection)
			const response = key && (await this.backend.doc.get(key))
			result = response && response.meta ? { ...response.meta, ...response.value } : undefined
		} else if (Array.isArray(selection))
			result = await Promise.all(selection.map(id => this.load(id)))
		else {
			result = [] // TODO: implement loading selections
		}
		return result
	}
	store(document: T & Partial<Document>): Promise<(T & Document) | undefined>
	store(documents: (T & Partial<Document>)[]): Promise<((T & Document) | undefined)[]>
	async store(
		documents: (T & Partial<Document>) | (T & Partial<Document>)[]
	): Promise<(T & Document) | undefined | ((T & Document) | undefined)[]> {
		let result: (T & Document) | undefined | ((T & Document) | undefined)[]
		if (!Array.isArray(documents)) {
			if (!this.configuration.retainChanged)
				documents = { ...documents, changed: isoly.DateTime.now() }
			const document =
				!Document.is(documents) || (await this.getKey(documents.id)) != this.generateKey(documents)
					? { ...documents, ...(await this.allocateId(documents)) }
					: undefined
			if (Document.is(document, this.configuration.idLength)) {
				const [meta, value] = Document.split(document)
				this.backend.doc.set(this.generateKey(meta), value, { meta })
				result = document
			} else
				result = undefined
		} else
			await Promise.all(documents.map(this.store.bind(this)))
		return result
	}
	remove(id: string): Promise<boolean>
	remove(id: string[]): Promise<boolean[]>
	remove(id: string | string[]): Promise<boolean> | Promise<boolean[]> {
		// TODO: implement
		throw new Error("Method not implemented.")
	}
	partition(...partition: string[]): Archive<T> {
		return new Archive<T>(this.backend, this.configuration, this.partitions + partition.join("/") + "/")
	}
	static reconfigure<T>(archive: Archive<T>, configuration: Configuration.Archive): Archive<T> {
		return new Archive<T>(archive.backend, { ...archive.configuration, ...configuration }, archive.partitions)
	}
	static open<T = any>(backend: KeyValueStore, configuration: Required<Configuration.Archive>): Archive<T>
	static open<T = any>(
		backend: KeyValueStore | undefined,
		configuration: Required<Configuration.Archive>
	): Archive<T> | undefined
	static open<T = any>(
		backend: KeyValueStore | undefined,
		configuration: Required<Configuration.Archive> = Configuration.Archive.standard
	): Archive<T> | undefined {
		return (
			backend &&
			new Archive<T>(
				{
					doc: KeyValueStore.partition<T, Document>(KeyValueStore.Json.create(backend), "doc/"), // retention expires
					id: KeyValueStore.partition<"", { key: Key }>(backend, "id/"), // retention expires
				},
				configuration
			)
		)
	}
}
