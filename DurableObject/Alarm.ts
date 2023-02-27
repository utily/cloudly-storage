import * as isoly from "isoly"
import * as platform from "@cloudflare/workers-types"

export class Alarm {
	private actions: Record<string, (() => Promise<void>) | undefined> = {}
	private prefix: string
	private precision: isoly.DateTime.Precision
	private limiter: string

	constructor(
		private readonly storage: platform.DurableObjectStorage,
		storageOptions?: { prefix?: string; limiter?: string; timeResolution?: isoly.DateTime.Precision }
	) {
		this.limiter = storageOptions?.limiter ?? "|"
		this.prefix = `${storageOptions?.prefix ?? "alarm"}${this.limiter}`
		this.precision = storageOptions?.timeResolution ?? "minutes"
	}

	async set(trigger: isoly.DateTime, action: string): Promise<void> {
		await this.storage.put(
			`${this.prefix}${isoly.DateTime.truncate(trigger, this.precision)}${this.limiter}${action}`,
			action
		)
		const next = [...(await this.storage.list<isoly.DateTime>({ prefix: this.prefix, limit: 1 })).keys()][0]
		await this.storage.setAlarm(isoly.DateTime.parse(next.split(this.limiter)[1]))
	}
	async register(name: string, action: () => Promise<void>) {
		this.actions[name] = action
	}

	async handle(): Promise<void> {
		const now = isoly.DateTime.epoch(isoly.DateTime.now())
		const alarms = [...(await this.storage.list({ prefix: this.prefix })).entries()]
			.filter(([k, v]) => isoly.DateTime.epoch(k.split(this.limiter)[1]) < now)
			.map(([k, v]) => [k, k.split(this.limiter)[2]])
		await Promise.all(alarms.map(a => this.actions[a[1]]?.().then(() => this.storage.delete(a[0]))))
	}
}
