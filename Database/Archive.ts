import { isoly } from "isoly"
import { KeyValueStore } from "../KeyValueStore"
import { Configuration } from "./Configuration"
import { Cursor } from "./Cursor"
import { Document } from "./Document"
import { Identifier } from "./Identifier"
import { Item } from "./Item"
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
			index?: Record<string, KeyValueStore<string>>
		},
		private readonly configuration: Configuration.Archive.Complete,
		readonly partitions: string = ""
	) {
		super()
	}
	private generateKey(document: Pick<Document, "id" | "created">): Key {
		return `${this.partitions}${document.created}/${document.id}`
	}
	private generateIndexKey(): Key {
		return `${this.partitions}${isoly.DateTime.now()}/${Identifier.generate(4)}`
	}
	async getKey(id: string) {
		return (await this.backend.id.get(id))?.value
	}
	async allocateId(document?: Identifier | Partial<Document>): Promise<Document | undefined> {
		if (typeof document != "object")
			document = { id: document }
		if (document.created == undefined)
			document = { ...document, created: isoly.DateTime.now() }
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
	async index(document: Partial<T & Document> & Pick<Document, "id">, index?: string): Promise<void> {
		index &&
			(await this.backend.index?.[index]?.set(
				this.generateIndexKey(),
				this.generateKey({ ...document, created: document.created ?? isoly.DateTime.now() }),
				{
					retention: this.configuration.retention,
				}
			))
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
		return cursor?.type == "changed"
			? await this.listChanged(cursor)
			: !cursor || cursor.type == "doc"
			? await this.listDocs(cursor)
			: await this.listIndex(cursor)
	}
	private async listIndex(cursor: Cursor): Promise<(Document & T)[] & { cursor?: string }> {
		const result: (T & Document)[] & { cursor?: string } = []
		let limit = cursor?.limit ?? Selection.standardLimit
		let newCursor: string | undefined
		for (const prefix of Cursor.dates(cursor)) {
			const loaded =
				(await this.backend.index?.[cursor.type]?.list({
					prefix: this.partitions + prefix,
					limit,
					cursor: cursor?.cursor,
				})) ?? []
			const listed = await Promise.all(
				loaded.reduce((r, item) => [...r, ...(item?.value ? [this.backend.doc.get(item.value)] : [])], [])
			).then(l => l.reduce((r, d) => (d?.value ? [...r, d.value] : r), []))
			limit -= listed.length
			result.push(...listed)
			if (loaded.cursor) {
				newCursor = Cursor.serialize({
					...cursor,
					range: cursor.range ? { end: cursor.range.end, start: prefix } : undefined,
					cursor: loaded.cursor,
				})
				break
			}
			delete cursor.cursor
		}
		if (newCursor && result)
			result.cursor = newCursor
		return result
	}
	private async listDocs(cursor?: Cursor): Promise<(Document & T)[] & { cursor?: string }> {
		const result: (T & Document)[] & { cursor?: string } = []
		let limit = cursor?.limit ?? Selection.standardLimit
		let newCursor: string | undefined
		for (const prefix of Cursor.dates(cursor)) {
			const loaded = await this.backend.doc.list({
				prefix: this.partitions + prefix,
				limit: limit <= 0 ? 1 : limit,
				cursor: cursor?.cursor,
				values: !cursor?.onlyMeta,
			})
			const items = await Promise.all(
				loaded.map(item =>
					this.configuration.meta?.is(item.value)
						? Promise.resolve({ meta: item.value, value: undefined })
						: this.backend.doc.get(item.key).then(document => ({ meta: item.value, value: document?.value }))
				)
			)
			const listed = items.map(item => ({
				...(item.meta ?? {}),
				...(item.value ?? {}),
			})) as (T & Document)[]
			limit -= listed.length
			result.push(...listed)
			cursor?.cursor && (cursor.cursor = loaded.cursor)
			if (loaded.cursor) {
				newCursor = Cursor.serialize({
					...(cursor ?? { type: "doc" }),
					range: cursor?.range ? { end: cursor.range?.end, start: prefix } : undefined,
					cursor: loaded.cursor,
				})
				break
			}
		}
		if (newCursor && result)
			result.cursor = newCursor
		return result
	}
	private async listChanged(cursor: Cursor): Promise<(Document & T)[] & { cursor?: string }> {
		let listed: Record<string, T & Document> = {}
		const limit = cursor?.limit ?? Selection.standardLimit
		const startTime = isoly.DateTime.is(cursor.range?.start) ? cursor.range?.start : undefined
		const endTime = isoly.DateTime.is(cursor.range?.end) ? cursor.range?.end : undefined
		const newCursor: Cursor = { type: "changed", limit: cursor?.limit }
		let usedChangeKeys = 0
		let prefix
		for (prefix of Cursor.dates(cursor)) {
			let breakMe = false
			do {
				newCursor.cursor = cursor.cursor
				const changes = await this.backend.changed.list({
					prefix: this.partitions + prefix,
					limit,
					cursor: cursor?.cursor,
				})
				const changedValues =
					startTime || endTime
						? changes.filter(e => {
								const time = Key.getTime(e.key) ?? "0"
								return (!startTime || startTime < time) && (!endTime || endTime >= time)
						  })
						: changes
				cursor.cursor = changes.cursor
				for (const change of changedValues) {
					const keys = (change?.value ?? "").split("\n")
					if (Object.keys(listed).length + keys.length <= limit) {
						usedChangeKeys++
						const loaded = (await Promise.all(keys.map(k => this.backend.doc.get(k)))).reduce(
							(r: Record<string, T & Document>, e) => (e?.value ? { ...r, [e.value.id]: e.value } : r),
							{}
						)
						listed = { ...listed, ...loaded }
					}
					if (Object.keys(listed).length >= limit) {
						const start = Key.getTime(change.key)
						newCursor.range = start ? { start, end: cursor.range?.end ?? isoly.DateTime.now() } : undefined
						breakMe = true
						break
					}
				}
			} while (!breakMe && cursor.cursor && Object.keys(listed).length < limit)
			if (breakMe)
				break
		}
		if (usedChangeKeys == limit)
			newCursor.cursor = cursor.cursor
		const result: (T & Document)[] & { cursor?: string } = Object.values(listed)
		if (newCursor.cursor || (newCursor.range?.start && newCursor.range.start != cursor.range?.start))
			result.cursor = Cursor.serialize(newCursor)
		return result
	}

	store(document: T & Partial<Document>, index?: string): Promise<(T & Document) | undefined>
	store(documents: (T & Partial<Document>)[], index?: string): Promise<((T & Document) | undefined)[]>
	async store(
		documents: (T & Partial<Document>) | (T & Partial<Document>)[],
		index?: string
	): Promise<(T & Document) | undefined | ((T & Document) | undefined)[]> {
		let result: (T & Document) | undefined | (T & Document)[] = Array.isArray(documents) ? [] : undefined
		for (let document of Array.isArray(documents) ? documents : [documents]) {
			document = { ...document, changed: isoly.DateTime.now() }
			if (!Document.is(document) || (await this.getKey(document.id)) != this.generateKey(document)) {
				const toBeStored = { ...document, ...(await this.allocateId(document)) } as T & Document
				Array.isArray(result) ? result.push(toBeStored) : (result = toBeStored)
			}
		}
		return result && (await this.set(result, index))
	}

	update(update: T & Partial<Document> & Pick<Document, "id">): Promise<(T & Document) | undefined>
	update(updates: (T & Partial<Document> & Pick<Document, "id">)[]): Promise<(T & Document)[] | undefined>
	async update(
		updates: (T & Partial<Document> & Pick<Document, "id">) | (T & Partial<Document> & Pick<Document, "id">)[]
	): Promise<((T & Document) | undefined) | ((T & Document) | undefined)[]> {
		const updated: (T & Document)[] = []
		for (const amendment of Array.isArray(updates) ? updates : [updates]) {
			const archived = (await this.load(amendment.id)) ?? (await this.allocateId(amendment))
			const document: (T & Document) | undefined = archived
				? {
						...amendment,
						created: archived.created,
						changed: isoly.DateTime.now(),
				  }
				: undefined
			document && updated.push(document)
		}
		return updated && (await this.set(Array.isArray(updates) ? updated : updated[0]))
	}

	private async set(document: T & Document, index?: string): Promise<(T & Document) | undefined>
	private async set(documents: (T & Document)[], index?: string): Promise<((T & Document) | undefined)[]>
	private async set(
		documents: (T & Document) | (T & Document)[],
		index?: string
	): Promise<((T & Document) | undefined) | ((T & Document) | undefined)[]>
	private async set(
		documents: (T & Document) | (T & Document)[],
		index?: string
	): Promise<((T & Document) | undefined) | ((T & Document) | undefined)[]> {
		let result: (T & Document) | undefined | ((T & Document) | undefined)[] = undefined
		if (Document.is(documents, this.configuration.idLength)) {
			const key = this.generateKey(documents)
			await this.backend.doc.set(key, (result = documents), { retention: this.configuration.retention })
			await this.index(documents, index)
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
						KeyValueStore.InMeta.create<T, Document>(
							Item.toTuple(configuration.meta?.split),
							KeyValueStore.Json.create(backend)
						),
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
					index: configuration.index?.reduce(
						(r, k) => ({
							...(!["doc", "id", "changed"].includes(k)
								? {
										[k]: KeyValueStore.partition(
											KeyValueStore.OnlyMeta.create<string>(backend),
											k + "/",
											completeConfiguration.retention
										),
								  }
								: {}),
							...r,
						}),
						{}
					),
				},
				completeConfiguration
			)
		)
	}
}
