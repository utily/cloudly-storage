import * as isoly from "isoly"
import "./load"
import "./store"
import { KeyValueStore } from "../../../KeyValueStore"
import { DurableObjectState } from "../../../platform"
import { Key } from "../../Key"
import { Context } from "./Context"
import { Environment } from "./Environment"
import { Portion } from "./Portion"

export class Backend {
	private constructor(private readonly state: DurableObjectState, private environment: Environment) {}

	async fetch(request: Request): Promise<Response> {
		await this.state.storage.setAlarm(Date.now() + 2 * 1000)
		return await Context.handle(request, { ...(this.environment ?? {}), state: this.state })
	}

	async alarm(): Promise<void> {
		console.log("this.state.id: ", this.state.id)
		const archiveTime = 20 * 1000
		const archiveThreshold = Date.now() - archiveTime
		const deleteThreshold = archiveThreshold - archiveTime + 500
		await this.remove(isoly.DateTime.create(deleteThreshold, "milliseconds").substring(0, 19))
		await this.archive(isoly.DateTime.create(archiveThreshold, "milliseconds").substring(0, 19)) // Should be set by some config
		const snooze = Date.now() + archiveTime - 10 * 1000
		await this.state.storage.setAlarm(snooze)
	}

	private async archive(threshold: isoly.DateTime): Promise<boolean> {
		const keyToBeStored = await this.getStaleKeys(threshold)
		console.log("keyToBeStored: ", keyToBeStored)
		await this.store(keyToBeStored)
		return true
	}
	private async remove(threshold: string): Promise<any> {
		const changed: Map<string, string> = await this.state.storage.list<string>({ prefix: "changed/" })
		const promises = []
		for (const [key, value] of changed.entries()) {
			if (Key.getLast(key) < threshold) {
				const docKeys = value.split("\n")
				const idIndexKey = docKeys.map(e => "id/" + Key.getLast(e))
				promises.push(Portion.remove([...docKeys, ...idIndexKey, key], this.state))
			}
		}
		return await Promise.all(promises)
	}

	private async store(keyToBeStored: string[]) {
		const listed = Object.fromEntries((await this.state.storage.list<any>({ prefix: "doc" })).entries())
		console.log("listed: ", listed)
		const kv = KeyValueStore.Json.create(this.environment.archive)
		await Promise.all(keyToBeStored.map(key => key && listed[key] && kv?.set(key, listed[key])))
		console.log("yolo swaggins", JSON.stringify(await kv?.list(), null, 2))
	}

	private async getStaleKeys(threshold: string) {
		const changedList = Object.fromEntries((await this.state.storage.list<string>({ prefix: "changed" })).entries())
		console.log("changedList: ", changedList)

		const keyToBeStored = Object.entries(changedList).reduce(
			(result, [key, value]) => [...(Key.getAt(key, 1) < threshold ? value.split("\n") : []), ...result],
			[]
		)
		return keyToBeStored
	}
}
