import * as gracely from "gracely"
import * as isoly from "isoly"
import * as DurableObject from "../../DurableObject"
import { Configuration } from "../Configuration"
import { Document } from "../Document"
import { Identifier } from "../Identifier"
import { Backend as BufferBackend } from "./Backend"

export type Backend = BufferBackend
export const Backend = BufferBackend

type Key = `${string}${isoly.DateTime}/${Identifier}`
type Loaded<T> = (T & Document) | undefined | ((Document & T) | undefined)[]

export class Buffer<T = any> {
	private constructor(
		private readonly backend: DurableObject.Namespace,
		private readonly configuration: Configuration.Buffer,
		private readonly partitions = ""
	) {}
	partition(...partition: string[]): Buffer<T> {
		return new Buffer<T>(this.backend, this.configuration, this.partitions + partition.join("/") + "/")
	}
	private generateKey(document: Pick<Document, "id" | "created">): Key {
		return `${this.partitions}${document.created}/${document.id}`
	}

	load(): Promise<(T & Document)[] | undefined>
	load(id: Identifier): Promise<(T & Document) | undefined>
	load(ids: Identifier[]): Promise<((Document & T) | undefined)[]>
	async load(selection?: Identifier | Identifier[]): Promise<Loaded<T>> {
		let response: Loaded<T> | gracely.Error | undefined
		switch (typeof selection) {
			case "string":
				response = await this.backend.open(this.partitions).get<Loaded<T>>(`/doc/${selection}`)
				break
			case "object":
				response = await this.backend.open(this.partitions).post<Loaded<T>>(`/doc`, { ids: selection })
				break
			case "undefined":
				response = await this.backend.open(this.partitions).get<Loaded<T>>(`/doc`)
				break
			default:
				break
		}
		return gracely.Error.is(response) ? undefined : response
	}
	async store(document: T): Promise<(T & Document) | undefined> {
		const response = await this.backend.open(this.partitions).post<T & Document>(`/doc`, document)
		return gracely.Error.is(response) ? undefined : response
	}
	async remove(id: T): Promise<T | gracely.Error> {
		return await this.backend.open(this.partitions).delete<T>(`/doc/${id}`)
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
		return backend && new Buffer<T>(backend, configuration)
	}
}
