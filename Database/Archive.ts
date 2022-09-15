import * as isoly from "isoly"
import { KeyValueStore } from "../KeyValueStore"
import { Configuration } from "./Configuration"
import { Cursor } from "./Cursor"
import { Document } from "./Document"
import { Identifier } from "./Identifier"
import { Key } from "./Key"
import { Selection } from "./Selection"
import { Silo } from "./Silo"

type Key = `${string}${isoly.DateTime}/${Identifier}`

export class Archive<T = any> extends Silo<T, Archive<T>> {
	private constructor(
		private readonly backend: {
			doc: KeyValueStore<T & Document>
			id: KeyValueStore<string>
			changed: KeyValueStore<string>
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
		selection?: Identifier | Identifier[] | Selection
	): Promise<Document | undefined | ((Document & T) | undefined)[] | ((Document & T)[] & { cursor?: string })> {
		let result: (T & Document) | undefined | ((Document & T) | undefined)[] | ((Document & T)[] & { cursor?: string })
		if (typeof selection == "string") {
			const key = await this.getKey(selection)
			result = key && key.startsWith(this.partitions) ? (await this.backend.doc.get(key))?.value : undefined
		} else if (Array.isArray(selection))
			result = await Promise.all(selection.map(id => this.load(id)))
		else
			result = await this.list(selection)
		return result
	}

	private async list(selection?: Selection): Promise<(Document & T)[] & { cursor?: string }> {
		const cursor = Cursor.from(selection)
		let result: (T & Document)[] & { cursor?: string } & {
			cursor?: string | undefined
		}
		if (cursor?.type == "changed")
			result = await this.listChanged(cursor)
		else
			result = await this.listDocs(cursor)
		return result
	}

	private async listDocs(cursor?: Cursor): Promise<(Document & T)[] & { cursor?: string }> {
		const result: (T & Document)[] & { cursor?: string } & {
			cursor?: string | undefined
		} = []
		let limit = cursor?.limit ?? Selection.standardLimit
		let newCursor: string | undefined
		console.log("prefixed: ", JSON.stringify(Cursor.prefix(cursor)))
		for (const prefix of Cursor.prefix(cursor)) {
			const loaded = await this.backend.doc.list({
				prefix: this.partitions + prefix,
				limit,
				cursor: cursor?.cursor,
			})
			const response = loaded.map(item => ({
				...(item.value ?? {}),
				...(item.meta ?? {}),
			})) as (T & Document)[]

			limit -= response.length
			result.push(...response)
			console.log("loaded.cursor: ", loaded.cursor)
			if (loaded.cursor) {
				newCursor = Cursor.serialize({ ...{ ...(cursor ?? { type: "doc" }) }, cursor: loaded.cursor })
				break
			}
		}
		if (newCursor && result)
			result.cursor = newCursor
		return result
	}
	private async listChanged(cursor: Cursor): Promise<(Document & T)[] & { cursor?: string }> {
		const result: (T & Document)[] & { cursor?: string } & {
			cursor?: string | undefined
		} = []
		let limit = cursor?.limit ?? Selection.standardLimit
		console.log("cursor: ", JSON.stringify(cursor, null, 2))
		const startFrom = !!cursor.range?.start && isoly.DateTime.is(cursor.range?.start) ? cursor.range?.start : undefined
		console.log("startFrom", startFrom)
		const prefixes = Cursor.prefix(cursor)
		let newCursor: string | undefined
		for (const prefix of prefixes) {
			const changes = await this.backend.changed.list({
				prefix: this.partitions + prefix,
				limit,
				cursor: cursor?.cursor,
			})
			console.log("changes: ", JSON.stringify(changes, null, 2))
			const changedValues = startFrom
				? changes.filter(e => {
						console.log("keytime: ", Key.getTime(e.key))
						console.log("keytime: ", startFrom)
						return Key.getTime(e.key) ?? "0" >= startFrom
				  })
				: changes
			console.log("changedValues: ", JSON.stringify(changedValues, null, 2))
			newCursor = changes.cursor
			for (const change of changedValues) {
				const keys = (change?.value ?? "").split("\n")
				if (keys.length <= limit) {
					console.log("limit1: ", limit)
					const loaded = await Promise.all(keys.map(k => this.backend.doc.get(k)))
					result.push(...loaded.reduce((r: (T & Document)[], e) => (e?.value ? [...r, e.value] : r), []))
					limit -= keys.length
				} else {
					console.log("limit2: ", limit)
					const start = change.key.split("/").find(e => isoly.DateTime.is(e))
					cursor.range = start ? { start, end: cursor.range?.end ?? isoly.DateTime.now() } : undefined
					break
				}
			}
		}
		if (cursor.range?.start != startFrom)
			result.cursor = Cursor.serialize({ ...cursor, cursor: newCursor ?? cursor.cursor })
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
			result = document && (await this.set(document))
		} else
			result = await Promise.all(documents.map(e => this.store(e)))
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
		if (Document.is(document, this.configuration.idLength)) {
			const key = this.generateKey(document)
			await this.backend.doc.set(key, (result = document))
			const changedKey =
				this.partitions + isoly.DateTime.truncate(isoly.DateTime.truncate(document.changed, "minutes"), "milliseconds")
			const changed = await this.backend.changed.get(changedKey)
			!changed?.value?.includes(key) &&
				(await this.backend.changed.set(changedKey, changed ? changed.value + "\n" + key : key))
		}
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
					changed: KeyValueStore.partition(KeyValueStore.Json.create<string>(backend), "changed/"), // retention expires
				},
				configuration
			)
		)
	}
}
