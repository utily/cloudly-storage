import * as gracely from "gracely"
import * as isoly from "isoly"
import * as DurableObject from "../../DurableObject"
import { Configuration } from "../Configuration"
import { Cursor } from "../Cursor"
import { Document } from "../Document"
import { Identifier } from "../Identifier"
import { Backend as BufferBackend } from "./Backend"

export type Backend = BufferBackend
export const Backend = BufferBackend

type Key = `${string}${isoly.DateTime}/${Identifier}`
type Loaded<T> = (T & Document) | undefined | ((Document & T) | undefined)[]

export class Buffer<T = any> {
	private header: Record<string, string>
	private constructor(
		private readonly backend: DurableObject.Namespace,
		private readonly configuration: Configuration.Buffer.Complete,
		private readonly partitions = ""
	) {
		this.header = {
			partitions: this.partitions,
			reconciliationInterval: JSON.stringify(this.configuration.reconciliationInterval),
			reconcileAfter: JSON.stringify(this.configuration.reconcileAfter),
			superimposeFor: JSON.stringify(this.configuration.superimposeFor),
			documentType: this.backend.partitions.slice(0, -1),
			retention: JSON.stringify(this.configuration.retention),
		}
	}
	partition(...partition: string[]): Buffer<T> {
		return new Buffer<T>(
			this.backend,
			partition.reduce(
				(r: Configuration.Collection.Complete, e) => ({ ...r, ...(r.partitions?.[e] ?? {}) }),
				this.configuration
			),
			this.partitions + partition.join("/") + "/"
		)
	}
	private generateKey(document: Pick<Document, "id" | "created">): Key {
		return `${this.backend.partitions}doc/${this.partitions}${document.created}/${document.id}`
	}

	private generatePrefix(prefix?: string): string {
		return this.backend.partitions + "doc/" + this.partitions + (prefix ?? "")
	}

	load(): Promise<(T & Document)[]>
	load(id: Identifier, options?: { lock?: isoly.DateSpan }): Promise<(T & Document) | undefined>
	load(ids: Identifier[], options?: { lock?: isoly.DateSpan }): Promise<((Document & T) | undefined)[]>
	load(cursor?: Cursor): Promise<((Document & T) | undefined)[]>
	load(cursor?: Identifier | Identifier[] | Cursor): Promise<Loaded<T>>
	async load(cursor?: Identifier | Identifier[] | Cursor, options?: { lock?: isoly.DateSpan }): Promise<Loaded<T>> {
		let response: Loaded<T> | gracely.Error | undefined
		if (typeof cursor == "string") {
			response = await this.backend
				.open(this.partitions + Configuration.Buffer.getShard(this.configuration, cursor))
				.get<Loaded<T>>(`/buffer/${encodeURIComponent(cursor)}`, {
					...this.header,
					lock: JSON.stringify(options?.lock),
				})
		} else if (Array.isArray(cursor)) {
			response = await this.backend
				.open(this.partitions)
				.post<Loaded<T>>(`/buffer/prefix`, { id: cursor }, { ...this.header, lock: JSON.stringify(options?.lock) })
		} else if (cursor != null && typeof cursor == "object") {
			const body = {
				prefix: Cursor.prefix(cursor).map(p => this.generatePrefix(p)),
				limit: cursor?.limit,
			}
			response = await Promise.all(
				Configuration.Buffer.getShard(this.configuration).map(s =>
					this.backend.open(this.partitions + s).post<Loaded<T>>("/buffer/prefix", body, this.header)
				)
			).then(r => r.flatMap(e => (gracely.Error.is(e) ? [] : e)))
		} else
			response = await Promise.all(
				Configuration.Buffer.getShard(this.configuration).map(shard =>
					this.backend
						.open(this.partitions + shard)
						.post<Loaded<T>>("/buffer/prefix", { prefix: this.generatePrefix() }, this.header)
				)
			).then(r => r.flatMap(e => (gracely.Error.is(e) ? [] : e)))
		return gracely.Error.is(response) ? undefined : response
	}
	async store(document: T & Document & { created?: isoly.DateTime }): Promise<(T & Document) | undefined>
	async store(document: (T & Document & { created?: isoly.DateTime })[]): Promise<(T & Document)[] | undefined>
	async store(
		document: (T & Document & { created?: isoly.DateTime }) | (T & Document & { created?: isoly.DateTime })[]
	): Promise<(T & Document) | (T & Document)[] | undefined>
	async store(
		document: (T & Document & { created?: isoly.DateTime }) | (T & Document & { created?: isoly.DateTime })[]
	): Promise<(T & Document) | (T & Document)[] | undefined> {
		let result: (T & Document)[] | (T & Document) | undefined
		if (!Array.isArray(document)) {
			const key = this.generateKey(document)
			const response = await this.backend
				.open(this.partitions + Configuration.Buffer.getShard(this.configuration, document.id))
				.post<T & Document>(`/buffer`, { [key]: document }, this.header)
			result = gracely.Error.is(response) ? undefined : response
		} else {
			result = (
				await Promise.all(
					Object.entries(
						Configuration.Buffer.getShard(
							this.configuration,
							document.map(d => d.id)
						)
					).map(([shard, ids]) =>
						this.backend.open(this.partitions + shard).post<(T & Document)[]>(
							`/buffer`,
							document.reduce((r, d) => (ids.includes(d.id) ? { [this.generateKey(d)]: d, ...r } : r), {}),
							this.header
						)
					)
				)
			).reduce((r: any[], e) => (gracely.Error.is(e) ? r : [...e, ...r]), [])
		}
		return result
	}
	async update(
		amendment: Partial<T & Document> & { id: Document["id"] },
		archived?: T & Document,
		unlock?: true
	): Promise<(T & Document) | undefined>
	async update(
		amendments: (Partial<T & Document> & { id: Document["id"] })[],
		archived?: Record<string, T & Document>,
		unlock?: true
	): Promise<((T & Document) | undefined)[]>
	async update(
		amendments: (Partial<T & Document> & { id: Document["id"] }) | (Partial<T & Document> & { id: Document["id"] })[],
		archived?: (T & Document) | Record<string, T & Document>,
		unlock?: true
	): Promise<(T & Document) | undefined | ((T & Document) | undefined)[]> {
		let result: (T & Document) | undefined | ((T & Document) | undefined)[]
		if (Array.isArray(amendments))
			result = await this.change(amendments, archived, "update", unlock)
		else {
			const updated = await this.backend
				.open(this.partitions + Configuration.Buffer.getShard(this.configuration, amendments.id))
				.put<T & Document>(
					`/buffer/document`,
					{
						amendment: {
							...amendments,
							changed: this.configuration.retainChanged ? isoly.DateTime.now() : amendments.changed,
							applyTo: amendments.changed,
						},
						archived,
					},
					this.header
				)
			result = gracely.Error.is(updated) ? undefined : updated
		}
		return result
	}
	async append(
		amendment: Partial<T & Document> & { id: Document["id"] },
		archived?: T & Document,
		unlock?: true
	): Promise<(T & Document) | undefined>
	async append(
		amendments: (Partial<T & Document> & { id: Document["id"] })[],
		archived?: Record<string, T & Document>,
		unlock?: true
	): Promise<((T & Document) | undefined)[]>
	async append(
		amendments: (Partial<T & Document> & { id: Document["id"] }) | (Partial<T & Document> & { id: Document["id"] })[],
		archived?: (T & Document) | Record<string, T & Document>,
		unlock?: true
	): Promise<(T & Document) | undefined | ((T & Document) | undefined)[]> {
		let result: (T & Document) | undefined | ((T & Document) | undefined)[]
		if (Array.isArray(amendments))
			result = await this.change(amendments, archived, "append", unlock)
		else {
			const updated = await this.backend
				.open(this.partitions + Configuration.Buffer.getShard(this.configuration, amendments.id))
				.patch<T & Document>(
					`/buffer/document`,
					{
						amendment: {
							...amendments,
							changed: this.configuration.retainChanged ? isoly.DateTime.now() : amendments.changed,
							applyTo: amendments.changed,
						},
						archived,
					},
					{ ...this.header, unlock: unlock?.toString() }
				)
			result = gracely.Error.is(updated) ? undefined : updated
		}
		return result
	}
	private async change(
		amendments: (Partial<T & Document> & { id: Document["id"] })[],
		archived: (T & Document) | Record<string, T & Document> | undefined,
		type: "update" | "append",
		unlock?: true
	): Promise<(T & Document) | ((T & Document) | undefined)[] | undefined> {
		return (
			await Promise.all(
				Object.entries(
					Configuration.Buffer.getShard(
						this.configuration,
						amendments.map(d => d.id)
					)
				).map(([shard, keys]) =>
					this.backend.open(this.partitions + shard)[type == "update" ? "put" : "patch"]<(T & Document)[]>(
						`/buffer/documents`,
						amendments.reduce(
							(r, d) =>
								keys.includes(d.id)
									? {
											...r,
											[d.id]: {
												amendment: {
													...d,
													changed: this.configuration.retainChanged ? isoly.DateTime.now() : d.changed,
													applyTo: d.changed,
												},
												archived: archived?.[d.id as keyof typeof archived],
											},
									  }
									: r,
							{}
						),
						{ ...this.header, unlock: unlock?.toString() }
					)
				)
			)
		).reduce((r: any[], e) => (gracely.Error.is(e) ? r : [...e, ...r]), [])
	}

	remove(id: string): Promise<boolean>
	remove(ids: string[]): Promise<boolean[]>
	remove(ids: string | string[]): Promise<boolean | boolean[]>
	async remove(ids: string | string[]): Promise<boolean | boolean[]> {
		//TODO: Test?
		let result: boolean | boolean[]
		if (Array.isArray(ids))
			result = (
				await Promise.all(
					Object.entries(this.partitions + Configuration.Buffer.getShard(this.configuration, ids)).map(
						([shard, keys]) => this.backend.open(shard).post<boolean[]>(`/buffer/delete`, keys)
					)
				)
			).flatMap<boolean>(e => (!gracely.Error.is(e) ? e : false))
		else {
			const response = await this.backend
				.open(this.partitions + Configuration.Buffer.getShard(this.configuration, ids))
				.delete<number>(`/buffer/${ids}`)
			result = !gracely.Error.is(response)
		}
		return result
	}
	static open<T extends object = any>(backend: DurableObject.Namespace, configuration: Configuration.Buffer): Buffer<T>
	static open<T extends object = any>(
		backend: DurableObject.Namespace | undefined,
		configuration: Configuration.Buffer
	): Buffer<T> | undefined
	static open<T extends object = any>(
		backend: DurableObject.Namespace | undefined,
		configuration: Configuration.Buffer = Configuration.Buffer.standard
	): Buffer<T> | undefined {
		return backend && new Buffer<T>(backend, { ...Configuration.Buffer.standard, ...configuration })
	}
}
