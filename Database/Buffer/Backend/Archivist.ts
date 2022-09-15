import * as isoly from "isoly"
import { Archive } from "../../../Database/Archive"
import { Configuration } from "../../../Database/Configuration"
import { Document } from "../../../Database/Document"
import { KeyValueStore } from "../../../KeyValueStore"
import { DurableObjectState, KVNamespace } from "../../../platform"
import { Key } from "../../Key"
import { Storage } from "./Storage"

interface ToArchive {
	complete: Record<string, string[]>
	partial?: [string, string[]]
}

export class Archivist {
	private archivizationLimit = 600
	private constructor(
		private readonly archive: Archive<Document & Record<string, any>>,
		private readonly storage: Storage,
		private readonly state: DurableObjectState,
		private readonly partitions = "",
		private readonly configurations = { remove: 5 * 60 * 1000 }
	) {}
	partition(...name: string[]): Archivist {
		return new Archivist(
			this.archive.partition(...name),
			this.storage,
			this.state,
			this.partitions + name.join("/") + "/"
		)
	}
	async reconcile(threshold: isoly.DateTime): Promise<((Document & Record<string, any>) | undefined)[]> {
		const changed = Array.from((await this.state.storage.list<string>({ prefix: "changed/" })).entries())
		const archived: isoly.DateTime | [string, string] | undefined = await this.state.storage.get<
			string | [string, string]
		>("archived")
		const lastArchived = !archived ? "" : typeof archived == "string" ? archived : Key.getLast(archived[0])
		archived && (await this.removeArchived(changed, lastArchived))
		const { complete, partial }: ToArchive = await this.getStaleKeys(threshold, changed, archived)
		const listed: Document[] | undefined =
			(await this.storage.load<Document>([...Object.values(complete).flat(), ...(partial?.[1] ?? [])])) ?? []
		const stored = listed && listed.length > 0 ? await this.archive.store(listed, true) : []
		stored &&
			!stored.some(e => !e) &&
			(await this.state.storage.put("archived", partial ? [partial[0], partial[1].slice(-1)[0]] : threshold))
		return stored
	}
	private async removeArchived(changed: [string, string][], lastArchived: isoly.DateTime): Promise<any> {
		const keys = []
		const remove = isoly.DateTime.previousSecond(lastArchived, this.configurations.remove)
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
		[documentType, ...partitions]: string[],
		idLength?: number
	): Archivist {
		const archivist = new Archivist(
			Archive.open<Document & Record<string, any>>(
				KeyValueStore.partition(KeyValueStore.open(keyValueNamespace, "text"), documentType + "/"),
				{
					...Configuration.Collection.standard,
					...(idLength ? { idLength: idLength as Configuration.Archive["idLength"] } : {}),
					retainChanged: true,
				}
			),
			Storage.open(state),
			state
		)
		const result = partitions.length > 0 ? archivist.partition(...partitions.slice()) : archivist
		return result
	}
}
