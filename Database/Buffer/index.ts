import * as isoly from "isoly"
import * as DurableObject from "../../DurableObject"
import { Error } from "../../Error"
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
			index: JSON.stringify(this.configuration.index),
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

	private generatePrefix(prefix?: string, index?: string): string {
		return index ? index + "/" + prefix : this.backend.partitions + "doc/" + this.partitions + (prefix ?? "")
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
				.get<Loaded<T>>(`/buffer/${encodeURIComponent(cursor)}`, {
					...this.header,
					...(options?.lock
						? { lock: isoly.DateTime.create(Date.now() + isoly.TimeSpan.toMilliseconds(options?.lock), "milliseconds") }
						: {}),
				})
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
		} else if (cursor != null && typeof cursor == "object") {
			const body = {
				prefix: Cursor.prefix(cursor).map(p => this.generatePrefix(p)),
				limit: cursor?.limit,
			}
			response = await Promise.all(
				Configuration.Buffer.getShard(this.configuration).map(s =>
					this.backend.open(this.partitions + s).post<Loaded<T>>("/buffer/prefix", body, this.header)
				)
			).then(r =>
				r.flatMap(e =>
					Error.is(e) ? [] : Array.isArray(e) ? e.map(d => (Array.isArray(d) ? { ...d[1], ...d[0] } : d)) : e
				)
			)
		} else
			response = await Promise.all(
				Configuration.Buffer.getShard(this.configuration).map(shard =>
					this.backend
						.open(this.partitions + shard)
						.post<[T & Document, T & Document][] | Loaded<T>>(
							"/buffer/prefix",
							{ prefix: this.generatePrefix() },
							this.header
						)
				)
			).then(r =>
				r.flatMap(e => {
					return Error.is(e) ? [] : Array.isArray(e) ? e.map(d => (Array.isArray(d) ? { ...d[1], ...d[0] } : d)) : e
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
					.post<T & Document>(
						`/buffer`,
						{ [this.generateKey(document)]: Document.split(document, this.configuration.meta) },
						this.header
					)
			} else {
				result = (
					await Promise.all(
						Object.entries(
							Configuration.Buffer.getShard(
								this.configuration,
								document.map(d => d.id)
							)
						).map(([shard, ids]) =>
							this.backend.open(this.partitions + shard).post<((T & Document) | Error)[]>(
								`/buffer`,
								document.reduce(
									(r, d) =>
										ids.includes(d.id)
											? { [this.generateKey(d)]: Document.split(document, this.configuration.meta), ...r }
											: r,
									{}
								),
								this.header
							)
						)
					)
				).reduce((r: any[], e) => (Error.is(e) ? r : [...e, ...r]), [])
			}
		} catch (e) {
			result = this.error("store", e)
		}
		return result
	}
	async change(
		amendments: Record<string, Partial<T & Document> & { id: Document["id"] }>,
		archived: Record<string, (T & Document) | undefined> | undefined,
		type: "update" | "append",
		index?: string,
		unlock?: true
	): Promise<((T & Document) | Error)[] | Error> {
		let result: ((T & Document) | Error)[] | Error
		try {
			const shards = Configuration.Buffer.getShard(this.configuration, Object.keys(amendments))
			const response = (
				await Promise.all(
					Object.entries(shards).map(([shard, keys]) =>
						this.backend.open(this.partitions + shard)[type == "update" ? "put" : "patch"]<((T & Document) | Error)[]>(
							`/buffer/documents`,
							keys.reduce(
								(r, id) => [
									...r,
									[
										{
											...amendments[id],
											changed: !this.configuration.retainChanged ? isoly.DateTime.now() : amendments[id].changed,
											applyTo: amendments[id].changed,
										},
										archived?.[id],
									],
								],
								[]
							),
							{
								...this.header,
								...(unlock ? { unlock: unlock.toString() } : {}),
								...(index ? { updateIndex: index } : {}),
							}
						)
					)
				)
			).reduce((r: any[], e) => {
				return Error.is(e) ? [e, ...r] : [...e, ...r]
			}, [])
			result = response
		} catch (e) {
			result = this.error(type, e)
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
