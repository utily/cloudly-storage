import * as isoly from "isoly"
import { Document } from "../../../Database/Document"
import { KeyValueStore } from "../../../KeyValueStore"
import { DurableObjectState, KVNamespace } from "../../../platform"
import { Key } from "../../Key"
import { Storage } from "./Storage"

export class Archivist {
	static #lastArchived: Promise<string | undefined>
	get lastArchived(): Promise<string | undefined> {
		return (Archivist.#lastArchived = Archivist.#lastArchived ?? this.state.storage.get("lastArchived"))
	}
	private constructor(
		private readonly backend: {
			doc: KeyValueStore<Record<string, any> & Document>
			changed: KeyValueStore<string>
		},
		private readonly partitions: string,
		private readonly storage: Storage,
		private readonly state: DurableObjectState,
		private readonly documentType: string,
		public readonly configuration = { remove: 30, limit: 600 }
	) {}
	private generateKey(document: Pick<Document, "id" | "created">): string {
		return `${this.partitions}${document.created}/${document.id}`
	}
	async reconcile(threshold: isoly.DateTime): Promise<Document[]> {
		await this.removeArchived(threshold)
		return await this.store(threshold)
	}
	private async store(threshold: isoly.DateTime): Promise<Document[]> {
		const promises: Promise<void>[] = []
		const result: Document[] = []
		const { documents, changed } = await this.getStale(threshold)
		if (documents.length > 0) {
			for (const document of documents) {
				promises.push(this.backend.doc.set(this.generateKey(document), document))
				result.push(document)
			}
			promises.push(
				this.backend.changed.set(
					`changed/${this.partitions}${isoly.DateTime.now()}/${documents[0].id}`,
					changed.replaceAll(this.documentType + "/doc/", "")
				)
			)
			await Promise.all(promises)
		}
		return result
	}
	private async removeArchived(threshold: string): Promise<void> {
		const lastArchived = await this.lastArchived
		const archived: isoly.DateTime | undefined = lastArchived ? Key.getAt(lastArchived, -2) : undefined
		if (archived) {
			const keys = []
			const remove = isoly.DateTime.previousSecond(threshold, this.configuration.remove)
			const changed = Array.from(
				(await this.state.storage.list<string>({ prefix: "changed/", limit: 2 * this.configuration.limit })).entries()
			)
			for (const [key, value] of changed)
				if (Key.getAt(key, -2) <= remove && Key.getAt(key, -2) <= archived)
					keys.push("id/" + Key.getLast(value), key, value)
			await this.storage.remove(keys)
		}
	}
	private async getStale(threshold: string): Promise<{ documents: Document[]; changed: string }> {
		const changes = Array.from(
			(
				await this.state.storage.list<string>({
					prefix: "changed/",
					limit: this.configuration.limit,
					startAfter: await this.lastArchived,
				})
			).entries()
		)
		const staleKeys: string[] = []
		let lastChanged: string | undefined
		for (const [key, value] of changes)
			if (Key.getAt(key, -2) < threshold) {
				lastChanged = key
				staleKeys.push(value)
			}
		if (lastChanged) {
			Archivist.#lastArchived = Promise.resolve(lastChanged)
			await this.state.storage.put<string>("lastArchived", lastChanged)
		}
		return { documents: await this.storage.load<Document>(staleKeys), changed: staleKeys.join("\n") } ?? {}
	}
	static open(
		keyValueNamespace: KVNamespace | undefined,
		state: DurableObjectState,
		documentType: string,
		partitions: string[]
	): Archivist {
		const kv = KeyValueStore.Json.create(
			KeyValueStore.partition(KeyValueStore.open(keyValueNamespace, "text"), documentType + "/")
		)
		const doc = KeyValueStore.partition(
			KeyValueStore.InMeta.create<Record<string, any>, Document>(Document.split, kv),
			"doc/"
		)
		return new Archivist(
			{ doc, changed: kv },
			partitions ? partitions.join("/") + "/" : "",
			Storage.open(state),
			state,
			documentType
		)
	}
}
