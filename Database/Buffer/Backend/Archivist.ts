import { isoly } from "isoly"
import * as platform from "@cloudflare/workers-types"
import { KeyValueStore } from "../../../KeyValueStore"
import { Document } from "../../Document"
import { Item } from "../../Item"
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
			doc: KeyValueStore<Record<string, any>, Document & Record<string, any>>
			changed: KeyValueStore<string>
		},
		private readonly storage: Storage,
		private readonly state: platform.DurableObjectState,
		private readonly configuration: Configuration.Complete,
		public readonly limit = 60
	) {}
	private generateKey(document: Pick<Document, "id" | "created">): string {
		return `${this.configuration.partitions}${document.created}/${document.id}`
	}
	async reconcile(now: isoly.DateTime): Promise<Document[] | undefined> {
		const threshold = isoly.DateTime.previousSecond(now, this.configuration.retention)
		let stored: Document[] | undefined
		try {
			await this.state.storage.put<Record<string, any>>("alarm/configuration/" + threshold, this.configuration)
			let lastArchived = await this.lastArchived
			lastArchived = lastArchived && (await this.state.storage.get(lastArchived ?? "")) ? lastArchived : undefined
			stored = await this.store(threshold, lastArchived)
			await this.removeArchived(threshold, lastArchived)
			await this.removeStatuses(threshold)
		} catch (error) {
			await this.state.storage.put("error", {
				timestamp: now,
				message: error.message,
			})
		}
		return stored
	}
	private async store(threshold: isoly.DateTime, lastArchived?: string): Promise<Document[]> {
		const promises: Promise<void>[] = []
		const result: Document[] = []
		const { documents, changed } = await this.getStale(threshold, lastArchived)
		if (documents.length > 0) {
			for (const document of documents) {
				const { meta, value } = Item.is(document)
					? document
					: (([m, v]) => ({ meta: m, value: v }))(Document.split(document))
				promises.push(
					this.backend.doc.set(this.generateKey(meta), value, { retention: this.configuration.timeToLive, meta })
				)
				result.push({ ...meta, ...value })
			}
			promises.push(
				this.backend.changed.set(
					`changed/${this.configuration.partitions}${isoly.DateTime.now()}/${result[0].id}`,
					changed.replaceAll(this.configuration.documentType + "/doc/", ""),
					{ retention: this.configuration.timeToLive }
				)
			)
			await Promise.all(promises)
		}
		return result
	}
	private async removeStatuses(threshold: string): Promise<void> {
		const removeTime = isoly.DateTime.previousHour(threshold, 1)
		await this.storage.remove(
			[
				...Array.from((await this.state.storage.list<string[]>({ prefix: "listed/changed/" })).keys()),
				...Array.from((await this.state.storage.list<string[]>({ prefix: "stale/keys/" })).keys()),
				...Array.from((await this.state.storage.list<string[]>({ prefix: "alarm/configuration/" })).keys()),
			].filter(k => (Key.getTime(k) ?? "") < removeTime)
		)
	}
	private async removeArchived(threshold: string, lastArchived?: string): Promise<void> {
		const archived: isoly.DateTime | undefined = lastArchived ? Key.getTime(lastArchived) : undefined
		if (archived) {
			const keys = []
			const remove = isoly.DateTime.previousSecond(threshold, this.configuration.removeAfter)
			const lastDocument = lastArchived && (await this.state.storage.get<string>(lastArchived))
			const changed = [
				...Array.from(
					(
						await this.state.storage.list<string>({ prefix: "changed/", limit: 2 * this.limit, end: lastArchived })
					).entries()
				),
				...(lastDocument ? [[lastArchived, lastDocument]] : []),
			]
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
				if (time && time <= remove && time <= archived) {
					keys.push("lock/" + Key.getLast(value), "id/" + Key.getLast(value), key, value)
					if (key == (await this.lastArchived)) {
						await this.state.storage.delete("lastArchived")
						Archivist.#lastArchived = Promise.resolve(undefined)
					}
				}
			}
			await this.storage.remove(keys)
		}
	}
	private async getStale(
		threshold: string,
		lastArchived?: string
	): Promise<{
		documents: (Item | Document)[]
		changed: string
	}> {
		const changes = Array.from(
			(
				await this.state.storage.list<string>({
					prefix: "changed/",
					limit: this.limit,
					startAfter: lastArchived,
				})
			).entries()
		)
		await this.state.storage.put("listed/changed/" + threshold, { changes: changes.map(([c, _]) => c), lastArchived })
		const staleKeys: string[] = []
		let lastChanged: string | undefined
		for (const [key, value] of changes) {
			if ((Key.getTime(key) ?? "") <= threshold) {
				lastChanged = key >= (lastChanged ?? "") ? key : lastChanged
				!staleKeys.includes(value) && staleKeys.push(value)
			} else
				break
		}
		await this.state.storage.put("stale/keys/" + threshold, { staleKeys, lastChanged })
		if (lastChanged) {
			Archivist.#lastArchived = Promise.resolve(lastChanged)
			await this.state.storage.put<string>("lastArchived", lastChanged)
		}
		return {
			documents: Array.from((await this.storage.storage.get<Item | Document>(staleKeys)).values()),
			changed: staleKeys.join("\n"),
		}
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
		const doc = KeyValueStore.partition<Record<string, any>, Document & Record<string, any>>(kv, "doc/")
		return new Archivist({ doc, changed: kv }, Storage.open(state), state, configuration)
	}
}
