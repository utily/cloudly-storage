import * as gracely from "gracely"
import * as isoly from "isoly"
import * as DurableObject from "../../DurableObject"
import { Configuration } from "../Configuration"
import { Document } from "../Document"
import { Identifier } from "../Identifier"

type Key = `${string}${isoly.DateTime}/${Identifier}`

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
	async load(id: string): Promise<T | gracely.Error> {
		return await this.backend.open(this.partitions).get<T>(`doc/${id}`)
	}
	store(document: T): T {
		return document
	}
	remove(id: T): any {
		return id
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
