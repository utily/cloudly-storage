import * as isoly from "isoly"
import { Archive } from "../../../Database/Archive"
import { Configuration } from "../../../Database/Configuration"
import { Document } from "../../../Database/Document"
import { KeyValueStore } from "../../../KeyValueStore"
import { DurableObjectState, KVNamespace } from "../../../platform"
import { Key } from "../../Key"
import { Storage } from "./Storage"

export class Archivist {
	private constructor(
		private readonly archive: Archive<Document & Record<string, any>>,
		private readonly storage: Storage,
		private readonly state: DurableObjectState,
		private readonly partitions = "",
		private readonly configurations = { remove: 10 * 1000 }
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
		const lastArchived: isoly.DateTime | undefined = await this.state.storage.get<string>("archived")
		lastArchived && (await this.removeArchived(changed, lastArchived))
		const staleKeys = await this.getStaleKeys(threshold, changed, lastArchived)
		const listed: Document[] | undefined = (await this.storage.load<Document>(staleKeys)) ?? []
		const stored = listed && listed.length > 0 ? await this.archive.store(listed, true) : []
		await this.state.storage.put("archived", threshold)
		return stored // TODO what to do if everything wasn't archived.
	}
	private async removeArchived(changed: [string, string][], lastArchived: isoly.DateTime): Promise<any> {
		const promises = []
		const remove = isoly.DateTime.previousSecond(lastArchived, this.configurations.remove)
		for (const [key, value] of changed) {
			if (Key.getLast(key) < (remove ?? "")) {
				const docKeys = value.split("\n")
				const idIndexKey = docKeys.map(e => "id/" + Key.getLast(e))
				promises.push(this.storage?.remove([...docKeys, ...idIndexKey, key]))
			}
		}
		return await Promise.all(promises)
	}
	private async getStaleKeys(threshold: string, changes?: [string, string][], archived?: string): Promise<string[]> {
		const result: string[] = []
		if (changes)
			for (const [key, value] of changes) {
				const keyDate = Key.getAt(key, 1)
				result.push(...((archived ?? "") <= keyDate && keyDate < threshold ? value.split("\n") : []))
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
