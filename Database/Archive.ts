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
		private readonly backend: {
			doc: KeyValueStore<T & Document>
			id: KeyValueStore<string>
		},
		private readonly configuration: Required<Configuration.Archive>,
		readonly partitions: string = ""
	) {
		super()
	}
	private generateKey(document: Pick<Document, "id" | "created">): Key {
		return `${this.partitions}${document.created}/${document.id}`
	}
	private async getKey(id: string) {
		return (await this.backend.id.get(id))?.value
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
			await this.backend.id.set(result.id, this.generateKey(result))
		else
			result = document.id == undefined ? await this.allocateId(document) : undefined
		return result
	}
	load(id: Identifier): Promise<(T & Document) | undefined>
	load(ids: Identifier[]): Promise<((Document & T) | undefined)[]>
	load(selection?: Selection): Promise<(Document & T)[] & { locus?: string }>
	async load(
		selection: Identifier | Identifier[] | Selection
	): Promise<Document | undefined | ((Document & T) | undefined)[] | ((Document & T)[] & { locus?: string })> {
		let result: (T & Document) | undefined | ((Document & T) | undefined)[] | ((Document & T)[] & { locus?: string })
		if (typeof selection == "string") {
			const key = await this.getKey(selection)
			result = key && key.startsWith(this.partitions) ? (await this.backend.doc.get(key))?.value : undefined
		} else if (Array.isArray(selection))
			result = await Promise.all(selection.map(id => this.load(id)))
		else
			result = await this.list(selection)
		return result
	}
	private async list(selection: Selection): Promise<(Document & T)[] & { locus?: string }> {
		const query: Selection.Query | undefined = Selection.get(selection)
		const prefixes: string[] = Selection.Query.extractPrefix(query)
		const responseList: KeyValueStore.ListItem<T & Document, undefined>[] &
			{
				cursor?: string | undefined
			}[] = []
		let limit = query?.limit ?? Selection.Query.standardLimit
		let locus: Selection.Locus | undefined
		for (const prefix of prefixes) {
			const response = await this.backend.doc.list({
				prefix: this.partitions + prefix,
				limit,
				cursor: query?.cursor,
			})
			limit -= response.length
			responseList.push(...response)
			if (response.cursor) {
				locus = Selection.Locus.generate({ ...(query ?? {}), cursor: response.cursor })
				break
			}
		}
		const result = responseList.map(item => ({
			...item.value,
			...(item.meta ?? {}),
		})) as (T & Document)[] & { locus?: string }
		if (locus)
			result.locus = locus
		return result
	}
	store(document: T & Partial<Document>, overwrite?: true): Promise<(T & Document) | undefined>
	store(documents: (T & Partial<Document>)[], overwrite?: true): Promise<((T & Document) | undefined)[]>
	async store(
		documents: (T & Partial<Document>) | (T & Partial<Document>)[],
		overwrite?: true
	): Promise<(T & Document) | undefined | ((T & Document) | undefined)[]> {
		let result: (T & Document) | undefined | ((T & Document) | undefined)[]
		if (!Array.isArray(documents)) {
			if (!this.configuration.retainChanged)
				documents = { ...documents, changed: isoly.DateTime.now() }
			const kvKey = Document.is(documents) && !overwrite ? await this.getKey(documents.id) : undefined
			const newKey = Document.is(documents) && !overwrite ? this.generateKey(documents) : null
			const document = overwrite
				? documents
				: !Document.is(documents) || kvKey != newKey
				? { ...documents, ...((await this.allocateId(documents)) ?? {}) }
				: undefined
			result = document && (await this.set(document))
		} else
			result = await Promise.all(documents.map(e => this.store(e, overwrite)))
		return result
	}
	async update(amendment: Partial<T & Document>): Promise<(T & Document) | undefined>
	async update(amendment: T & Document): Promise<(T & Document) | undefined>
	async update(amendment: Partial<T & Document>): Promise<(T & Document) | undefined> {
		const archived = await (amendment.id ? this.load(amendment.id) : undefined)
		const updated = archived && Document.update(archived, { ...amendment, created: archived.created })
		return updated && (await this.set(updated))
	}
	async append(amendment: Partial<T & Document>): Promise<(T & Document) | undefined> {
		const archived = await (amendment.id ? this.load(amendment.id) : undefined)
		const appended = archived && Document.append(archived, { ...amendment, created: archived.created })
		return appended && (await this.set(appended))
	}
	private async set(document: T & Partial<Document>): Promise<(T & Document) | undefined> {
		let result: (T & Document) | undefined = undefined
		if (Document.is(document, this.configuration.idLength))
			await this.backend.doc.set(this.generateKey(document), (result = document))
		return result
	}
	remove(id: string): Promise<boolean>
	remove(ids: string[]): Promise<boolean[]>
	remove(ids: string | string[]): Promise<boolean | boolean[]>
	async remove(ids: string | string[]): Promise<boolean | boolean[]> {
		let result: boolean | boolean[]
		if (typeof ids == "string") {
			const key = await this.getKey(ids)
			if ((result = !!key))
				await this.backend.doc.set(key)
		} else
			result = await Promise.all(ids.map(id => this.remove(id)))
		return result
	}
	partition(...partition: string[]): Archive<T> {
		return new Archive<T>(this.backend, this.configuration, this.partitions + partition.join("/") + "/")
	}
	static reconfigure<T>(archive: Archive<T>, configuration: Configuration.Archive): Archive<T> {
		return new Archive<T>(archive.backend, { ...archive.configuration, ...configuration }, archive.partitions)
	}
	static open<T extends object = any>(
		backend: KeyValueStore<string, any>,
		configuration: Required<Configuration.Archive>
	): Archive<T>
	static open<T extends object = any>(
		backend: KeyValueStore<string, any> | undefined,
		configuration: Required<Configuration.Archive>
	): Archive<T> | undefined
	static open<T extends object = any>(
		backend: KeyValueStore<string, any> | undefined,
		configuration: Required<Configuration.Archive> = Configuration.Archive.standard
	): Archive<T> | undefined {
		return (
			backend &&
			new Archive<T>(
				{
					doc: KeyValueStore.partition(
						KeyValueStore.InMeta.create<T, Document>(Document.split, KeyValueStore.Json.create(backend)),
						"doc/"
					), // retention expires
					id: KeyValueStore.partition(KeyValueStore.OnlyMeta.create<string>(backend), "id/"), // retention expires
				},
				configuration
			)
		)
	}
}
