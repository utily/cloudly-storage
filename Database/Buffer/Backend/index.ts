import * as isoly from "isoly"
import "./load"
import "./store"
import { Archive } from "../../../Database/Archive"
import { Configuration } from "../../../Database/Configuration"
import { Document } from "../../../Database/Document"
import { KeyValueStore } from "../../../KeyValueStore"
import { DurableObjectState } from "../../../platform"
import { Key } from "../../Key"
import { Context } from "./Context"
import { Environment } from "./Environment"
import { Storage } from "./Storage"

export class Backend {
	alarmTime = 10 * 1000
	partitions?: string[]
	idLength?: number
	private constructor(private readonly state: DurableObjectState, private environment: Environment) {
		this.state.blockConcurrencyWhile(async () => {
			this.partitions = await this.state.storage.get("partitions")
			!!(await this.state.storage.getAlarm()) ||
				(await (async () => {
					await this.state.storage.setAlarm(this.alarmTime)
					return true
				})())
		})
	}

	async fetch(request: Request): Promise<Response> {
		this.state.waitUntil(this.configuration(request))
		return await Context.handle(request, { ...(this.environment ?? {}), state: this.state })
	}

	async configuration(request: Request): Promise<void> {
		const idLength = +(request.headers.get("length") ?? NaN)
		this.idLength = Number.isNaN(idLength) ? undefined : idLength
		const partitions = request.headers.get("partitions")?.split("/").slice(0, -1)
		!this.partitions &&
			!(this.partitions = await this.state.storage.get("partitions")) &&
			partitions &&
			this.state.waitUntil(this.state.storage.put("partitions", (this.partitions = partitions)))
	}

	async alarm(): Promise<void> {
		const archiveTime = 12 * 1000 //after settlement
		const archiveThreshold = isoly.DateTime.create(Date.now() - archiveTime, "milliseconds").substring(0, 19) //replace by new isoly function
		const changed: [string, string][] = Array.from(
			(await this.state.storage.list<string>({ prefix: "changed/" })).entries()
		)
		const archived = await this.state.storage.get<string>("archived")
		await this.removeArchived(changed, archived)
		await this.archive(archiveThreshold, changed, archived) // Should be set by some config
		const snooze = Date.now() + archiveTime - 7 * 1000
		await this.state.storage.setAlarm(snooze)
	}

	private async archive(threshold: isoly.DateTime, changed: [string, string][], archived?: string): Promise<boolean> {
		const keyToBeStored = await this.getStaleKeys(threshold, changed, archived)
		const stored = keyToBeStored.length > 0 ? await this.store(keyToBeStored) : 0
		stored > 0 && (await this.state.storage.put("archived", threshold))
		return true // TODO what to do if everything wasn't archived.
	}
	private async removeArchived(changed: [string, string][], archived?: string): Promise<any> {
		const promises = []
		for (const [key, value] of changed) {
			if (Key.getLast(key) < (archived ?? "")) {
				const docKeys = value.split("\n")
				const idIndexKey = docKeys.map(e => "id/" + Key.getLast(e))
				promises.push(Storage.open(this.state)?.remove([...docKeys, ...idIndexKey, key]))
			}
		}
		return await Promise.all(promises)
	}

	private async store(keysToBeStored: string[]): Promise<number> {
		// const listed = Object.fromEntries((await this.state.storage.list<any>({ prefix: "doc" })).entries())
		const listed: Document[] | undefined = Object.values(
			(await Storage.open(this.state)?.load<Document>(keysToBeStored)) ?? {}
		)
		const partition = this.partitions ?? (await this.state.storage.get("partitions")) ?? []

		const KV = KeyValueStore.open(this.environment.archive, "text")
		const archive = Archive.open(
			partition.length > 0 ? KeyValueStore.partition(KV, partition.splice(0, 1) + "/") : KV,
			{
				...Configuration.Collection.standard,
				...(this.idLength ? { idLength: this.idLength as 4 } : {}),
			}
		)
		const partitioned = partition.length > 0 ? archive.partition(...partition) : archive

		const stored = listed.length > 0 ? await partitioned.store(listed) : 0
		return stored ? 1 : 0
	}

	private async getStaleKeys(threshold: string, changes: [string, string][], archived?: string): Promise<string[]> {
		const result: string[] = []
		for (const [key, value] of changes) {
			const keyDate = Key.getAt(key, 1)
			result.push(...((archived ?? "") < keyDate && keyDate < threshold ? value.split("\n") : []))
		}
		return result
	}
}
