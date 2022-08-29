import * as gracely from "gracely"
import * as isoly from "isoly"
import * as DurableObject from "../../DurableObject"
import { Configuration } from "../Configuration"
import { Document } from "../Document"
import { Identifier } from "../Identifier"
import { Selection } from "../Selection"
import { Backend as BufferBackend } from "./Backend"

export type Backend = BufferBackend
export const Backend = BufferBackend

type Key = `${string}${isoly.DateTime}/${Identifier}`
type Loaded<T> = (T & Document) | undefined | ((Document & T) | undefined)[]

export class Buffer<T = any> {
	private header: Record<string, string>
	private constructor(
		private readonly backend: DurableObject.Namespace,
		private readonly configuration: Configuration.Buffer,
		private readonly partitions = ""
	) {
		this.header = {
			partitions: this.partitions,
			length: { ...Configuration.Buffer.standard, ...this.configuration }.idLength.toString(),
		}
	}
	partition(...partition: string[]): Buffer<T> {
		return new Buffer<T>(
			this.backend.partition(...partition),
			this.configuration,
			this.partitions + partition.join("/") + "/"
		)
	}
	private generateKey(document: Pick<Document, "id" | "created">): Key {
		return `doc/${this.partitions}${document.created}/${document.id}`
	}

	load(): Promise<(T & Document)[]>
	load(id: Identifier): Promise<(T & Document) | undefined>
	load(ids: Identifier[]): Promise<((Document & T) | undefined)[]>
	load(query: Selection.Query): Promise<((Document & T) | undefined)[]>
	load(query?: Identifier | Identifier[] | Selection.Query): Promise<Loaded<T>>
	async load(query?: Identifier | Identifier[] | Selection.Query): Promise<Loaded<T>> {
		let response: Loaded<T> | gracely.Error | undefined
		if (typeof query == "string") {
			response = await this.backend
				.open(Configuration.Buffer.getShard(this.configuration, query))
				.get<Loaded<T>>(`/buffer/${encodeURIComponent(query)}`, {
					partitions: this.partitions,
					length: { ...Configuration.Buffer.standard, ...this.configuration }.idLength.toString(),
				})
		} else if (Array.isArray(query)) {
			response = await this.backend.open(this.partitions).post<Loaded<T>>(`/buffer/prefix`, { id: query }, this.header)
		} else if (query != null && typeof query == "object") {
			const body = { prefix: Selection.Query.extractPrefix(query).map(p => this.partitions + p), limit: query?.limit }
			response = await Promise.all(
				Configuration.Buffer.getShard(this.configuration).map(s =>
					this.backend.open(s).post<Loaded<T>>("/buffer/prefix", body, this.header)
				)
			).then(r => r.flatMap(e => (gracely.Error.is(e) ? [] : e)))
		} else
			response = await Promise.all(
				Configuration.Buffer.getShard(this.configuration).map(shard =>
					this.backend.open(shard).get<Loaded<T>>(`/buffer`, this.header)
				)
			).then(r => r.flatMap(e => (gracely.Error.is(e) ? [] : e)))

		return gracely.Error.is(response) ? undefined : response
	}
	async store(document: T & Document & { created?: isoly.DateTime }): Promise<(T & Document) | undefined>
	async store(document: (T & Document & { created?: isoly.DateTime })[]): Promise<(T & Document)[] | undefined>
	async store(
		document: (T & Document & { created?: isoly.DateTime }) | (T & Document)[]
	): Promise<(T & Document) | (T & Document)[] | undefined> {
		let response: (T & Document)[] | (T & Document) | gracely.Error
		if (!Array.isArray(document))
			response = await this.backend
				.open(Configuration.Buffer.getShard(this.configuration, document.id))
				.post<T & Document>(`/buffer`, { [this.generateKey(document)]: document }, this.header)
		else
			response = (
				await Promise.all(
					Object.entries(
						Configuration.Buffer.getShard(
							this.configuration,
							document.map(d => d.id)
						)
					).map(([key, value]) =>
						this.backend.open(key).post<T & Document>(
							`/buffer`,
							document.reduce((r, d) => (value.includes(d.id) ? { [this.generateKey(d)]: d, ...r } : r), {}),
							this.header
						)
					)
				)
			).reduce((r, e) => (gracely.Error.is(e) ? r : [e, ...r]), [])
		return gracely.Error.is(response) ? undefined : response
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
					Object.entries(Configuration.Buffer.getShard(this.configuration, ids)).map(([shard, keys]) =>
						this.backend.open(shard).post<boolean[]>(`/buffer/delete`, keys)
					)
				)
			).flatMap<boolean>(e => (!gracely.Error.is(e) ? e : false))
		else {
			const response = await this.backend
				.open(Configuration.Buffer.getShard(this.configuration, ids))
				.delete<number>(`/buffer/${ids}`)
			result = !gracely.Error.is(response)
		}
		return result
	}
	static open<T extends object = any>(
		backend: DurableObject.Namespace,
		configuration: Required<Configuration.Buffer>
	): Buffer<T>
	static open<T extends object = any>(
		backend: DurableObject.Namespace | undefined,
		configuration: Required<Configuration.Buffer>
	): Buffer<T> | undefined
	static open<T extends object = any>(
		backend: DurableObject.Namespace | undefined,
		configuration: Required<Configuration.Buffer> = Configuration.Buffer.standard
	): Buffer<T> | undefined {
		return backend && new Buffer<T>(backend, configuration, backend.partitions)
	}
}
