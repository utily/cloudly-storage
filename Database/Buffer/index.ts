import * as isoly from "isoly"
import * as DurableObject from "../../DurableObject"
import { Error } from "../../Error"
import { Configuration } from "../Configuration"
import { Cursor } from "../Cursor"
import { Document } from "../Document"
import { Identifier } from "../Identifier"
import { Item } from "../Item"
import { Backend as BufferBackend } from "./Backend"
import { Status } from "./Status"

export type Backend = BufferBackend
export const Backend = BufferBackend

type Key = `${string}${isoly.DateTime}/${Identifier}`
type Loaded<T> =
	| (T & Document)
	| Item<Document & T, T>
	| undefined
	| ((Document & T) | undefined)[]
	| Item<Document & T, T>[]

export class Buffer<T = any> {
	private header: Record<string, string>
	private readonly split: ReturnType<typeof Item.to>
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
			index: JSON.stringify(this.configuration.index),
		}
		this.split = Item.to(configuration.meta?.split)
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

	private generatePrefix(date = "", index?: string): string {
		return index == "doc" || !index ? this.backend.partitions + "doc/" + this.partitions + date : index + "/" + date
	}

	async status(
		options: Status.Options<boolean | undefined>
	): Promise<Status<T, [string, string] | [string, string][]> | Error> {
		return await this.backend
			.open(this.partitions + Configuration.Buffer.getShard(this.configuration, options.id))
			.post<Status<T, [string, string] | [string, string][]>>("/buffer/status", options, this.header)
	}

	load(): Promise<(T & Document)[] | Error>
	load(id: Identifier, options?: { lock?: isoly.DateSpan }): Promise<(T & Document) | Error>
	load(ids: Identifier[], options?: { lock?: isoly.DateSpan }): Promise<(Document & T)[] | Error>
	load(cursor?: Cursor): Promise<(Document & T)[] | Error>
	load(cursor?: Identifier | Identifier[] | Cursor): Promise<Loaded<T> | Error>
	async load(
		cursor?: Identifier | Identifier[] | Cursor,
		options?: { lock?: isoly.DateSpan }
	): Promise<Loaded<T> | Error> {
		let response: Loaded<T> | Error | undefined
		if (typeof cursor == "string") {
			response = await this.backend
				.open(this.partitions + Configuration.Buffer.getShard(this.configuration, cursor))
				.get<(T & Document) | Item<Document & T, T> | undefined>(`/buffer/${encodeURIComponent(cursor)}`, {
					...this.header,
					...(options?.lock
						? { lock: isoly.DateTime.create(Date.now() + isoly.TimeSpan.toMilliseconds(options?.lock), "milliseconds") }
						: {}),
				})
				.then(r => (Item.is(r) ? Item.concat(r.meta, r.value) : r))
		} else if (Array.isArray(cursor)) {
			response = await this.backend.open(this.partitions).post<Loaded<T>>(
				`/buffer/prefix`,
				{ id: cursor },
				{
					...this.header,
					...(options?.lock
						? {
								lock: isoly.DateTime.create(Date.now() + isoly.TimeSpan.toMilliseconds(options?.lock), "milliseconds"),
						  }
						: {}),
				}
			)
			response = Array.isArray(response)
				? response.flatMap(e => {
						return Error.is(e)
							? []
							: Array.isArray(e)
							? e.map(d => (Item.is(d) ? Item.concat<Item<Document, T>>(d.meta, d.value) : d))
							: Item.is(e)
							? Item.concat<Item<Document, T>>(e.meta, e.value)
							: e
				  })
				: response
		} else if (cursor != null && typeof cursor == "object") {
			const body = {
				prefix: Cursor.dates(cursor).map(d => this.generatePrefix(d, cursor.type)),
				limit: cursor?.limit,
			}
			response = await Promise.all(
				Configuration.Buffer.getShard(this.configuration).map(s =>
					this.backend.open(this.partitions + s).post<Loaded<T>>("/buffer/prefix", body, this.header)
				)
			).then(r =>
				r.flatMap(e => {
					const result = Error.is(e)
						? []
						: Array.isArray(e)
						? e.map(d => (Item.is(d) ? Item.concat<Item<Document, T>>(d.meta, d.value) : d))
						: Item.is(e)
						? Item.concat<Item<Document, T>>(e.meta, e.value)
						: e
					return result
				})
			)
		} else
			response = await Promise.all(
				Configuration.Buffer.getShard(this.configuration).map(shard =>
					this.backend
						.open(this.partitions + shard)
						.post<Loaded<T>>("/buffer/prefix", { prefix: this.generatePrefix() }, this.header)
				)
			).then(r =>
				r.flatMap(e => {
					return Error.is(e)
						? []
						: Array.isArray(e)
						? e.map(d => (Item.is(d) ? Item.concat<Item<Document, T>>(d.meta, d.value) : d))
						: Item.is(e)
						? Item.concat<Item<Document, T>>(e.meta, e.value)
						: e
				})
			)
		return response
	}
	async store(document: T & Document & { created?: isoly.DateTime }): Promise<(T & Document) | Error>
	async store(document: (T & Document & { created?: isoly.DateTime })[]): Promise<(T & Document)[] | Error>
	async store(
		document: (T & Document & { created?: isoly.DateTime }) | (T & Document & { created?: isoly.DateTime })[]
	): Promise<(T & Document) | (T & Document)[] | Error>
	async store(
		document: (T & Document & { created?: isoly.DateTime }) | (T & Document & { created?: isoly.DateTime })[]
	): Promise<(T & Document) | ((T & Document) | Error)[] | Error> {
		let result: ((T & Document) | Error)[] | (T & Document) | Error
		try {
			if (!Array.isArray(document)) {
				result = await this.backend
					.open(this.partitions + Configuration.Buffer.getShard(this.configuration, document.id))
					.post<T & Document>(`/buffer`, { [this.generateKey(document)]: this.split(document) }, this.header)
			} else {
				result = (
					await Promise.all(
						Object.entries(
							Configuration.Buffer.getShard(
								this.configuration,
								document.map(d => d.id)
							)
						).map(([shard, ids]) =>
							this.backend.open(this.partitions + shard).post<(T & Document) | ((T & Document) | Error)[]>(
								`/buffer`,
								document.reduce(
									(r, d) => (ids.includes(d.id) ? { [this.generateKey(d)]: this.split(d), ...r } : r),
									{}
								),
								this.header
							)
						)
					)
				).reduce((r: any[], e) => (Error.is(e) ? r : Array.isArray(e) ? [...e, ...r] : [e, ...r]), [])
			}
		} catch (e) {
			result = this.error("store", e)
		}
		return result
	}
	async update(
		amendments: Record<string, T & Document & { created?: isoly.DateTime }>,
		index?: string,
		unlock?: true
	): Promise<((T & Document) | Error)[] | Error> {
		let result: ((T & Document) | Error)[] | Error
		try {
			const shards = Configuration.Buffer.getShard(this.configuration, Object.keys(amendments))
			const response = (
				await Promise.all(
					Object.entries(shards).map(([shard, keys]) =>
						this.backend.open(this.partitions + shard).put<((T & Document) | Error)[]>(
							`/buffer/documents`,
							keys.reduce((r, id) => [...r, this.split(amendments[id])], []),
							{
								...this.header,
								...(unlock ? { unlock: unlock.toString() } : {}),
								...(index ? { updateIndex: index } : {}),
							}
						)
					)
				)
			).reduce((r: (Error | (T & Document))[], e) => {
				return Error.is(e) ? [e, ...r] : [...(Array.isArray(e) ? e : [e]), ...r]
			}, [])
			result = response
		} catch (e) {
			result = this.error("update", e)
		}
		return result
	}
	error(point: Error.Point, error?: any): Error {
		return Error.create(`Buffer.${point}`, error)
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
			).flatMap<boolean>(e => (!Error.is(e) ? e : false))
		else {
			const response = await this.backend
				.open(this.partitions + Configuration.Buffer.getShard(this.configuration, ids))
				.delete<number>(`/buffer/${ids}`)
			result = !Error.is(response)
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
