import * as isoly from "isoly"
import "./load"
import "./store"
import * as storage from "../../../Database"
import { DurableObjectState } from "../../../platform"
import { Key } from "../../Key"
import { Context } from "./Context"
import { Environment } from "./Environment"
import { Portion } from "./Portion"

export class Backend {
	private constructor(private readonly state: DurableObjectState, private environment: Environment) {}

	async fetch(request: Request): Promise<Response> {
		!(await this.state.storage.getAlarm()) && (await this.state.storage.setAlarm(Date.now() + 20 * 1000))
		return await Context.handle(request, { ...(this.environment ?? {}), state: this.state })
	}

	async alarm(): Promise<void> {
		const archiveTime = 20 * 1000 //after settlement
		const archiveThreshold = isoly.DateTime.create(Date.now() - archiveTime, "milliseconds").substring(0, 19) //replace by new isoly function
		await this.remove()
		await this.archive(archiveThreshold) // Should be set by some config
		const snooze = Date.now() + archiveTime - 10 * 1000
		await this.state.storage.setAlarm(snooze)
	}

	private async archive(threshold: isoly.DateTime): Promise<boolean> {
		const keyToBeStored = await this.getStaleKeys(threshold)
		await this.store(keyToBeStored)
		await this.state.storage.put("archived", threshold)
		return true
	}
	private async remove(): Promise<any> {
		const changed: Map<string, string> = await this.state.storage.list<string>({ prefix: "changed/" })
		const promises = []
		for (const [key, value] of changed.entries()) {
			if (Key.getLast(key) < ((await this.state.storage.get<string>("archived")) ?? "")) {
				const docKeys = value.split("\n")
				const idIndexKey = docKeys.map(e => "id/" + Key.getLast(e))
				promises.push(Portion.remove([...docKeys, ...idIndexKey, key], this.state))
			}
		}
		return await Promise.all(promises)
	}

	private async store(keysToBeStored: string[]) {
		const listed = Object.fromEntries((await this.state.storage.list<any>({ prefix: "doc" })).entries())
		const db = storage.Database.create<{ archive: { yolo: any } }>(
			{
				silos: { users: { type: "archive", idLength: 4, retainChanged: true } },
			},
			this.environment.archive
		)
		const stored = await Promise.all(keysToBeStored.map(key => db?.yolo?.store(listed[key])))
		stored.length > 0 && console.log("alarm stored: ", JSON.stringify(stored, null, 2))
	}

	private async getStaleKeys(threshold: string) {
		const changedList = Object.fromEntries((await this.state.storage.list<string>({ prefix: "changed" })).entries())
		const keyToBeStored = Object.entries(changedList).reduce(
			(result, [key, value]) => [...(Key.getAt(key, 1) < threshold ? value.split("\n") : []), ...result],
			[]
		)
		return keyToBeStored
	}
}
