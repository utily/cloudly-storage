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
		private readonly configuration: Configuration.Archive.Complete,
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
			document = { ...document, changed: isoly.DateTime.now() }
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
			await this.backend.id.set(result.id, this.generateKey(result), { retention: this.configuration.retention })
		else
			result = document.id == undefined ? await this.allocateId(document) : undefined
		return result
	}
	load(id: Identifier): Promise<(T & Document) | undefined>
	load(ids: Identifier[]): Promise<((Document & T) | undefined)[]>
	load(selection?: Selection): Promise<(Document & T)[] & { cursor?: string }>
	async load(
		selection?: Identifier | Identifier[] | Selection
	): Promise<Document | undefined | ((Document & T) | undefined)[] | ((Document & T)[] & { cursor?: string })> {
		let result: (T & Document) | undefined | ((Document & T) | undefined)[] | ((Document & T)[] & { cursor?: string })
		if (typeof selection == "string") {
			const key = await this.getKey(selection)
			const document = key && key.startsWith(this.partitions) ? (await this.backend.doc.get(key))?.value : undefined
			result = document ? document : undefined
		} else if (Array.isArray(selection))
			result = await Promise.all(selection.map(id => this.load(id)))
		else
			result = await this.list(selection)
		return result
	}

	private async list(selection?: Selection): Promise<(Document & T)[] & { cursor?: string }> {
		const cursor = Cursor.from(selection)
		return cursor?.type == "changed" ? await this.listChanged(cursor) : await this.listDocs(cursor)
	}

	private async listDocs(cursor?: Cursor): Promise<(Document & T)[] & { cursor?: string }> {
		const result: (T & Document)[] & { cursor?: string } & {
			cursor?: string | undefined
		} = []
		let limit = cursor?.limit ?? Selection.standardLimit
		let newCursor: string | undefined
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
		const startFrom = isoly.DateTime.is(cursor.range?.start) ? cursor.range?.start : undefined
		const prefixes = Cursor.prefix(cursor)
		let newCursor: string | undefined
		for (const prefix of prefixes) {
			const changes = await this.backend.changed.list({
				prefix: this.partitions + prefix,
				limit,
				cursor: cursor?.cursor,
			})
			const changedValues = startFrom
				? changes.filter(e => {
						return (Key.getTime(e.key) ?? "0") >= startFrom
				  })
				: changes
			newCursor = changes.cursor
			for (const change of changedValues) {
				const keys = (change?.value ?? "").split("\n")
				if (keys.length <= limit) {
					const loaded = await Promise.all(keys.map(k => this.backend.doc.get(k)))
					result.push(...loaded.reduce((r: (T & Document)[], e) => (e?.value ? [...r, e.value] : r), []))
					limit -= keys.length
				} else {
					const start = Key.getTime(change.key)
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
		let result: (T & Document) | undefined | (T & Document)[] = Array.isArray(documents) ? [] : undefined
		for (let document of Array.isArray(documents) ? documents : [documents]) {
			if (!this.configuration.retainChanged)
				document = { ...document, changed: isoly.DateTime.now() }
			if (!Document.is(document) || (await this.getKey(document.id)) != this.generateKey(document)) {
				const toBeStored = { ...document, ...(await this.allocateId(document)) } as T & Document
				Array.isArray(result) ? result.push(toBeStored) : (result = toBeStored)
			}
		}
		return result && (await this.set(result))
	}

	async update(amendment: Partial<T & Document>): Promise<(T & Document) | undefined>
	async update(amendment: T & Document): Promise<(T & Document) | undefined>
	async update(amendments: Partial<T & Document>[]): Promise<((T & Document) | undefined)[]>
	async update(
		amendments: Partial<T & Document> | Partial<T & Document>[]
	): Promise<(T & Document) | undefined | ((T & Document) | undefined)[]> {
		let updated: ((T & Document) | undefined) | (T & Document)[] = []
		if (Array.isArray(amendments)) {
			for (const amendment of amendments) {
				const archived = await (amendment.id ? this.load(amendment.id) : undefined)
				const document =
					archived && Document.update<Document & T>(archived, { ...amendment, created: archived.created })
				document && updated.push(document)
			}
		} else {
			const archived = await (amendments.id ? this.load(amendments.id) : undefined)
			updated = archived && Document.update(archived, { ...amendments, created: archived.created })
		}
		return updated && (await this.set(updated))
	}
	async append(amendment: Partial<T & Document>): Promise<(T & Document) | undefined>
	async append(amendment: T & Document): Promise<(T & Document) | undefined>
	async append(amendments: Partial<T & Document>[]): Promise<((T & Document) | undefined)[]>
	async append(
		amendments: Partial<T & Document> | Partial<T & Document>[]
	): Promise<(T & Document) | undefined | ((T & Document) | undefined)[]> {
		let updated: ((T & Document) | undefined) | (T & Document)[] = []
		if (Array.isArray(amendments)) {
			for (const amendment of amendments) {
				const archived = await (amendment.id ? this.load(amendment.id) : undefined)
				const document =
					archived && Document.append<Document & T>(archived, { ...amendment, created: archived.created })
				document && updated.push(document)
			}
		} else {
			const archived = await (amendments.id ? this.load(amendments.id) : undefined)
			updated = archived && Document.append(archived, { ...amendments, created: archived.created })
		}
		return updated && (await this.set(updated))
	}
	private async set(document: T & Document): Promise<(T & Document) | undefined>
	private async set(documents: (T & Document)[]): Promise<((T & Document) | undefined)[]>
	private async set(
		documents: (T & Document) | (T & Document)[]
	): Promise<((T & Document) | undefined) | ((T & Document) | undefined)[]>
	private async set(
		documents: (T & Document) | (T & Document)[]
	): Promise<((T & Document) | undefined) | ((T & Document) | undefined)[]> {
		let result: (T & Document) | undefined | ((T & Document) | undefined)[] = undefined
		if (Document.is(documents, this.configuration.idLength)) {
			const key = this.generateKey(documents)
			await this.backend.doc.set(key, (result = documents), { retention: this.configuration.retention })
			const changedKey =
				this.partitions + isoly.DateTime.truncate(isoly.DateTime.truncate(documents.changed, "minutes"), "milliseconds")
			const changed = await this.backend.changed.get(changedKey)
			!changed?.value?.includes(key) &&
				(await this.backend.changed.set(changedKey, changed ? changed.value + "\n" + key : key),
				{ retention: this.configuration.retention })
		} else if (Array.isArray(documents) && !documents.some(e => !Document.is(e, this.configuration.idLength))) {
			const changes: Record<string, string[]> = {}
			await Promise.all(
				documents.map(d => {
					const key = this.generateKey(d)
					const changedKey =
						this.partitions + isoly.DateTime.truncate(isoly.DateTime.truncate(d.changed, "minutes"), "milliseconds")
					changes[changedKey] ? changes[changedKey].push(key) : (changes[changedKey] = [key])
					return this.backend.doc.set(key, d, { retention: this.configuration.retention })
				})
			)
			await Promise.all(
				Object.entries(changes).map(async ([changedKey, documents]) => {
					const changed = await this.backend.changed.get(changedKey)
					const value =
						(changed ? changed.value + "\n" : "") + documents.filter(d => !changed?.value.includes(d)).join("\n")
					await this.backend.changed.set(changedKey, value, { retention: this.configuration.retention })
				})
			)
			result = documents
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
			if ((result = !!key)) {
				await this.backend.doc.set(key, undefined)
				await this.backend.id.set(ids, undefined)
			}
		} else
			result = await Promise.all(ids.map(id => this.remove(id)))
		return result
	}
	partition(...partition: string[]): Archive<T> {
		return new Archive<T>(
			this.backend,
			partition.reduce(
				(r: Configuration.Archive.Complete, e) => ({ ...r, partitions: undefined, ...(r.partitions?.[e] ?? {}) }),
				this.configuration
			),
			this.partitions + partition.join("/") + "/"
		)
	}
	static reconfigure<T>(archive: Archive<T>, configuration: Configuration.Archive): Archive<T> {
		return new Archive<T>(archive.backend, { ...archive.configuration, ...configuration }, archive.partitions)
	}
	static open<T extends object = any>(
		backend: KeyValueStore<string, any>,
		configuration: Configuration.Archive
	): Archive<T>
	static open<T extends object = any>(
		backend: KeyValueStore<string, any> | undefined,
		configuration: Configuration.Archive
	): Archive<T> | undefined
	static open<T extends object = any>(
		backend: KeyValueStore<string, any> | undefined,
		configuration: Configuration.Archive = Configuration.Archive.standard
	): Archive<T> | undefined {
		const completeConfiguration: Configuration.Archive.Complete = {
			...Configuration.Archive.standard,
			...configuration,
		}
		return (
			backend &&
			new Archive<T>(
				{
					doc: KeyValueStore.partition(
						KeyValueStore.InMeta.create<T, Document>(Document.split, KeyValueStore.Json.create(backend)),
						"doc/",
						completeConfiguration.retention
					),
					id: KeyValueStore.partition(
						KeyValueStore.OnlyMeta.create<string>(backend),
						"id/",
						completeConfiguration.retention
					),
					changed: KeyValueStore.partition(
						KeyValueStore.Json.create<string>(backend),
						"changed/",
						completeConfiguration.retention
					),
				},
				completeConfiguration
			)
		)
	}
}
