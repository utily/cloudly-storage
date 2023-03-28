import * as isoly from "isoly"
import * as platform from "@cloudflare/workers-types"
import { Document } from "../../../Database/Document"
import { KeyValueStore } from "../../../KeyValueStore"
import { Key } from "../../Key"
import { Configuration } from "./Configuration"
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
		private readonly storage: Storage,
		private readonly state: platform.DurableObjectState,
		private readonly configuration: Configuration.Complete,
		public readonly limit = 600
	) {}
	private generateKey(document: Pick<Document, "id" | "created">): string {
		return `${this.configuration.partitions}${document.created}/${document.id}`
	}
	async reconcile(now: isoly.DateTime): Promise<Document[]> {
		const threshold = isoly.DateTime.previousSecond(now, this.configuration.retention)
		await this.removeArchived(threshold)
		return await this.store(threshold)
	}
	private async store(threshold: isoly.DateTime): Promise<Document[]> {
		const promises: Promise<void>[] = []
		const result: Document[] = []
		const { documents, changed } = await this.getStale(threshold)
		if (documents.length > 0) {
			for (const document of documents) {
				promises.push(
					this.backend.doc.set(this.generateKey(document), document, { retention: this.configuration.timeToLive })
				)
				result.push(document)
			}
			promises.push(
				this.backend.changed.set(
					`changed/${this.configuration.partitions}${isoly.DateTime.now()}/${documents[0].id}`,
					changed.replaceAll(this.configuration.documentType + "/doc/", ""),
					{ retention: this.configuration.timeToLive }
				)
			)
			await Promise.all(promises)
		}
		return result
	}
	private async removeArchived(threshold: string): Promise<void> {
		const lastArchived = await this.lastArchived
		const archived: isoly.DateTime | undefined = lastArchived ? Key.getTime(lastArchived) : undefined
		if (archived) {
			const keys = []
			const remove = isoly.DateTime.previousSecond(threshold, this.configuration.removeAfter)
			const changed = Array.from(
				(await this.state.storage.list<string>({ prefix: "changed/", limit: 2 * this.limit })).entries()
			)
			const indices =
				this.configuration.index &&
				(await Promise.all(
					this.configuration.index.flatMap(async i =>
						this.state.storage.list<string>({ prefix: i + "/", limit: 2 * this.limit })
					)
				).then(listed => listed.flatMap(map => Array.from(map.entries()))))
			for (const [key] of indices ?? []) {
				const time = Key.getTime(key)
				if (time && time <= remove && time <= archived)
					keys.push(key)
			}
			for (const [key, value] of changed) {
				const time = Key.getTime(key)
				if (time && time <= remove && time <= archived)
					keys.push("lock/" + Key.getLast(value), "id/" + Key.getLast(value), key, value)
			}
			await this.storage.remove(keys)
		}
	}
	private async getStale(threshold: string): Promise<{ documents: Document[]; changed: string }> {
		const changes = Array.from(
			(
				await this.state.storage.list<string>({
					prefix: "changed/",
					limit: this.limit,
					startAfter: await this.lastArchived,
				})
			).entries()
		)
		const staleKeys: string[] = []
		let lastChanged: string | undefined
		for (const [key, value] of changes) {
			const time = Key.getTime(key)
			if ((time ?? "") < threshold) {
				lastChanged = time ? key : lastChanged
				staleKeys.push(value)
			} else
				break
		}
		if (lastChanged) {
			Archivist.#lastArchived = Promise.resolve(lastChanged)
			await this.state.storage.put<string>("lastArchived", lastChanged)
		}
		return { documents: await this.storage.load<Document>(staleKeys), changed: staleKeys.join("\n") } ?? {}
	}
	static open(
		keyValueNamespace: platform.KVNamespace | undefined,
		state: platform.DurableObjectState,
		configuration: Configuration.Complete
	): Archivist {
		const kv = KeyValueStore.Json.create(
			KeyValueStore.partition(
				KeyValueStore.open(keyValueNamespace, "text"),
				(configuration?.documentType ?? "unknown") + "/"
			)
		)
		const doc = KeyValueStore.partition(
			KeyValueStore.InMeta.create<Record<string, any>, Document>(Document.split, kv),
			"doc/"
		)
		return new Archivist({ doc, changed: kv }, Storage.open(state), state, configuration)
	}
}
