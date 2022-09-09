import * as isoly from "isoly"
import { Document } from "../../../Database/Document"
import { KeyValueStore } from "../../../KeyValueStore"
import { DurableObjectState, KVNamespace } from "../../../platform"
import { Key } from "../../Key"
import { Storage } from "./Storage"

interface ToArchive {
	changed?: Record<string, string>
	complete: Record<string, string[]>
	partial?: [string, string[]]
}

export class Archivist {
	private archivizationLimit = 600
	private constructor(
		private readonly backend: {
			doc: KeyValueStore<Record<string, any> & Document>
			changed: KeyValueStore<string>
		},
		private readonly partitions: string,
		private readonly storage: Storage,
		private readonly state: DurableObjectState,
		private readonly configurations = { remove: 5 * 60 }
	) {}
	private generateKey(document: Pick<Document, "id" | "created">): string {
		return `${this.partitions}${document.created}/${document.id}`
	}
	async reconcile(threshold: isoly.DateTime): Promise<Document[] | undefined> {
		const changedIndex = Array.from((await this.state.storage.list<string>({ prefix: "changed/" })).entries())
		const archived: isoly.DateTime | [string, string] | undefined = await this.state.storage.get<
			string | [string, string]
		>("archived")
		const lastArchived = !archived ? "" : typeof archived == "string" ? archived : Key.getLast(archived[0])
		archived && (await this.removeArchived(changedIndex, lastArchived))
		const { complete, partial, changed }: ToArchive = await this.getStaleKeys(threshold, changedIndex, archived)
		const listed: (Document[] & { changed?: Record<string, string> }) | undefined =
			(await this.storage.load<Document>([...Object.values(complete).flat(), ...(partial?.[1] ?? [])])) ?? []
		console.log("listed: ", JSON.stringify(listed, null, 2))
		const stored = listed && listed.length > 0 ? await this.store(listed, changed) : []
		console.log("stored: ", JSON.stringify(stored, null, 2))
		stored &&
			!stored.some(e => !e) &&
			(await this.state.storage.put("archived", partial ? [partial[0], partial[1].slice(-1)[0]] : threshold))
		return stored
	}
	private async store(documents: Document[], changed?: Record<string, string>): Promise<Document[] | undefined> {
		const promises: Promise<void>[] = []
		const result: Document[] = []
		for (const document of documents) {
			promises.push(this.backend.doc.set(this.generateKey(document), document))
			result.push(document)
		}
		for (const [key, value] of Object.entries(changed ?? {})) {
			promises.push(
				this.backend.changed.set(
					key + "/" + documents[0].id.substring(0, 2),
					value
						.split("\n")
						.map(e => e)
						.join("\n")
				)
			)
		}
		await Promise.all(promises)
		return result
	}
	private async removeArchived(changed: [string, string][], lastArchived: isoly.DateTime): Promise<any> {
		const keys = []
		const remove = isoly.DateTime.truncate(
			isoly.DateTime.previousSecond(lastArchived, this.configurations.remove),
			"seconds"
		)
		for (const [key, value] of changed) {
			if (Key.getLast(key) < (remove ?? "")) {
				const docKeys = value.split("\n")
				const idIndexKey = docKeys.map(e => "id/" + Key.getLast(e))
				keys.push(...docKeys, ...idIndexKey, key)
			}
		}
		return await this.storage.remove(keys)
	}
	private async getStaleKeys(
		threshold: string,
		changes?: [string, string][],
		archived?: string | [string, string]
	): Promise<ToArchive> {
		const result: ToArchive = { complete: {} }
		let length = 0
		const [lastArchivedKey, lastArchived] = !archived || typeof archived == "string" ? [] : archived
		if (changes)
			for (const [key, value] of changes) {
				const keyDate = Key.getLast(key)
				if (
					(typeof archived == "string" ? archived : Key.getLast(lastArchivedKey ?? "")) <= keyDate &&
					keyDate < threshold
				) {
					const values = value.split("\n")
					const documentKeys = lastArchived ? values.slice(values.indexOf(lastArchived) + 1) : values
					if (length + documentKeys.length < this.archivizationLimit) {
						console.log("values: ", JSON.stringify(values))
						result.changed = { ...result.changed, [key]: value }
						result.complete[key] = documentKeys
						length += documentKeys.length
					} else {
						result.partial = [key, documentKeys.slice(0, this.archivizationLimit)]
						break
					}
				}
			}
		return result
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
		return new Archivist({ doc, changed: kv }, partitions ? partitions.join("/") + "/" : "", Storage.open(state), state)
	}
}
