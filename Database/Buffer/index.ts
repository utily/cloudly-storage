import * as gracely from "gracely"
import * as isoly from "isoly"
import * as DurableObject from "../../DurableObject"
import { Configuration } from "../Configuration"
import { Cursor } from "../Cursor"
import { Document } from "../Document"
import { Identifier } from "../Identifier"
import { Selection } from "../Selection"
import { Backend as BufferBackend } from "./Backend"

export type Backend = BufferBackend
export const Backend = BufferBackend

type Key = `${string}${isoly.DateTime}/${Identifier}`
type Loaded<T> = (T & Document) | undefined | (((Document & T) | undefined)[] & { cursor?: Cursor.Buffer })

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

	load(): Promise<(Document & T)[] & { cursor?: Cursor.Buffer }>
	load(id: Identifier, options?: { lock?: isoly.DateSpan }): Promise<(T & Document) | undefined>
	load(ids: Identifier[], options?: { lock?: isoly.DateSpan }): Promise<((Document & T) | undefined)[]>
	load(selection?: Selection): Promise<(Document & T)[] & { cursor?: Cursor.Buffer }>
	load(selection?: Identifier | Identifier[] | Selection): Promise<Loaded<T>>
	async load(
		selection?: Identifier | Identifier[] | Selection,
		options?: { lock?: isoly.DateSpan }
	): Promise<Loaded<T>> {
		let response: Loaded<T> | gracely.Error | undefined
		if (typeof selection == "string") {
			response = await this.backend
				.open(this.partitions + Configuration.Buffer.getShard(this.configuration, selection))
				.get<Loaded<T>>(`/buffer/${encodeURIComponent(selection)}`, {
					...this.header,
					...(options?.lock
						? { lock: isoly.DateTime.create(Date.now() + isoly.TimeSpan.toMilliseconds(options?.lock), "milliseconds") }
						: {}),
				})
		} else if (Array.isArray(selection)) {
			const shards = Configuration.Buffer.getShard(this.configuration, selection)
			response = (
				await Promise.all(
					Object.entries(shards).map(([shard, ids]) =>
						this.backend.open(this.partitions + shard).post<((Document & T) | undefined)[]>(`/buffer/prefix`, ids, {
							...this.header,
							...(options?.lock
								? {
										lock: isoly.DateTime.create(
											Date.now() + isoly.TimeSpan.toMilliseconds(options?.lock),
											"milliseconds"
										),
								  }
								: {}),
						})
					)
				)
			).reduce((r: ((Document & T) | undefined)[], e) => (gracely.Error.is(e) ? r : [...r, ...e]), [])
		} else {
			const cursor: Cursor.Buffer | undefined = Cursor.Buffer.from(selection)
			const newCursor: Cursor.Buffer | undefined = cursor && {
				...cursor,
				shard: undefined,
			}
			response = []
			const shards = !cursor
				? []
				: cursor.shard
				? Object.keys(cursor.shard)
				: Configuration.Buffer.getShard(this.configuration)
			for (const shard of shards) {
				const shardCursor = Cursor.Shard.from(shard, this.configuration.shards, cursor)
				const listed = await this.backend
					.open(this.partitions + shard)
					.post<{ value: (Document & T)[]; cursor: string }>("/buffer/prefix", { cursor: shardCursor }, this.header)
				if (!gracely.Error.is(listed)) {
					listed.cursor &&
						newCursor &&
						(newCursor?.shard
							? (newCursor.shard[shard] = listed.cursor)
							: (newCursor.shard = { [shard]: listed.cursor }))
					response.push(...listed.value)
				}
			}
			response.cursor = newCursor?.shard && newCursor
		}
		return gracely.Error.is(response) ? undefined : response
	}

	async store(document: T & Document & { created?: isoly.DateTime }, unlock?: true): Promise<(T & Document) | undefined>
	async store(
		document: (T & Document & { created?: isoly.DateTime })[],
		unlock?: true
	): Promise<(T & Document)[] | undefined>
	async store(
		document: (T & Document & { created?: isoly.DateTime }) | (T & Document & { created?: isoly.DateTime })[],
		unlock?: true
	): Promise<(T & Document) | (T & Document)[] | undefined>
	async store(
		document: (T & Document & { created?: isoly.DateTime }) | (T & Document & { created?: isoly.DateTime })[],
		unlock?: true
	): Promise<(T & Document) | (T & Document)[] | undefined> {
		let result: (T & Document)[] | (T & Document) | undefined
		const header = { ...this.header, ...(unlock ? { unlock: unlock.toString() } : {}) }
		if (!Array.isArray(document)) {
			const key = this.generateKey(document)
			const response = await this.backend
				.open(this.partitions + Configuration.Buffer.getShard(this.configuration, document.id))
				.post<T & Document>(`/buffer`, { [key]: document }, header)
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
							header
						)
					)
				)
			).reduce((r: any[], e) => (gracely.Error.is(e) ? r : [...e, ...r]), [])
		}
		return result
	}

	async change(
		amendments: Record<string, Partial<T & Document> & { id: Document["id"] }>,
		archived: Record<string, (T & Document) | undefined> | undefined,
		type: "update" | "append",
		unlock?: true
	): Promise<(T & Document) | ((T & Document) | undefined)[] | undefined> {
		const shards = Configuration.Buffer.getShard(this.configuration, Object.keys(amendments))
		const response = (
			await Promise.all(
				Object.entries(shards).map(([shard, keys]) =>
					this.backend.open(this.partitions + shard)[type == "update" ? "put" : "patch"]<(T & Document)[]>(
						`/buffer/documents`,
						keys.reduce(
							(r, id) => [
								...r,
								[
									{
										...amendments[id],
										changed:
											!this.configuration.retainChanged || !amendments[id].changed
												? isoly.DateTime.now()
												: amendments[id].changed,
										applyTo: amendments[id].changed,
									},
									archived?.[id],
								],
							],
							[]
						),
						{ ...this.header, ...(unlock ? { unlock: unlock.toString() } : {}) }
					)
				)
			)
		).reduce((r: any[], e) => {
			return gracely.Error.is(e) ? r : [...e, ...r]
		}, [])
		return Object.keys(amendments).length == 1 && response ? response[0] : response
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
