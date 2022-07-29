import * as isoly from "isoly"
import { KeyValueStore } from "../KeyValueStore"
import { Configuration } from "./Configuration"
import { Document } from "./Document"
import { Identifier } from "./Identifier"

type Key = `${string}${isoly.DateTime}/${Identifier}`

export class Archive<T> {
	private constructor(
		private readonly backend: { doc: KeyValueStore<T, Document>; id: KeyValueStore<null, { key: Key }> },
		private readonly configuration: Required<Configuration.Collection>,
		private readonly partitions: string = ""
	) {}
	async allocateId(
		id?: Identifier,
		created?: isoly.DateTime
	): Promise<{ id: Identifier; created: isoly.DateTime } | undefined> {
		let result =
			(id != undefined && !Identifier.is(id, this.configuration.idLength)) ||
			(created != undefined && !isoly.DateTime.is(created))
				? undefined
				: {
						id: id ?? Identifier.generate(this.configuration.idLength),
						created: created ?? isoly.DateTime.now(),
				  }
		if (result && !(await this.backend.id.get(result.id)))
			await this.backend.id.set(result.id, null, this.generateKey(result))
		else
			result = id == undefined ? await this.allocateId(undefined, created) : undefined
		return result
	}
	private generateKey(document: Pick<Document, "id" | "created">): Key {
		return `${this.partitions}${document.created}/${document.id}`
	}
	async store(documents: (T & Document)[]): Promise<void> {
		await Promise.all(
			documents.map(document => {
				const [meta, value] = Document.split(document)
				return this.backend.doc.set(this.generateKey(meta), value, { meta }) // TODO: retention expires
			})
		)
	}
	//TODO: load list and remove
	async load(id: Identifier): Promise<Document | undefined> {
		const key = (await this.backend.id.get(id))?.meta?.key
		const result = key && (await this.backend.doc.get(key))
		return result && result.meta ? { ...result.meta, ...result.value } : undefined
	}
	partition(...partition: Identifier[]): Archive<T> {
		return new Archive(this.backend, this.configuration, this.partitions + partition.join("/") + "/")
	}
	static open<T>(
		backend: KeyValueStore | undefined,
		configuration: Required<Configuration.Collection>
	): Archive<T> | undefined {
		return (
			backend &&
			new Archive<T>(
				{
					doc: KeyValueStore.partition<T, Document>(backend, "doc/"),
					id: KeyValueStore.partition<null, { key: Key }>(backend, "id/"),
				},
				configuration
			)
		)
	}
}
