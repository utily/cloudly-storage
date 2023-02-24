import * as isoly from "isoly"
import * as platform from "@cloudflare/workers-types"

export class Alarm {
	private actions: Record<string, (() => Promise<void>) | undefined> = {}

	constructor(private readonly storage: platform.DurableObjectStorage) {}

	async set(trigger: isoly.DateTime, action: string): Promise<void> {
		await this.storage.put(`alarm|${isoly.DateTime.truncate(trigger, "minutes")}|${action}`, action)
		const next = [...(await this.storage.list<isoly.DateTime>({ prefix: "alarm|", limit: 1 })).keys()][0]
		await this.storage.setAlarm(isoly.DateTime.parse(next.split("|")[1]))
	}
	async register(name: string, action: () => Promise<void>) {
		this.actions[name] = action
	}

	async handle(): Promise<void> {
		const alarms = [...(await this.storage.list({ prefix: "alarm|" })).entries()]
		await Promise.all(alarms.map(a => this.actions[a[0]]?.()))
	}
}
