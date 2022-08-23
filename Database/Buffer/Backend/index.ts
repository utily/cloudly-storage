import * as isoly from "isoly"
import "./load"
import "./store"
import { DurableObjectState } from "../../../platform"
import { Archivist } from "./Archivist"
import { Context } from "./Context"
import { Environment } from "./Environment"

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
		return this.state.blockConcurrencyWhile(() =>
			Context.handle(request, { ...(this.environment ?? {}), state: this.state })
		)
	}

	async configuration(request: Request): Promise<void> {
		const idLength = +(request.headers.get("length") ?? NaN)
		this.idLength = this.idLength ?? (Number.isNaN(idLength) ? undefined : idLength)
		this.state.waitUntil(
			(async (): Promise<any> =>
				(await this.state.storage.get("idLength")) ??
				(idLength ? this.state.storage.put("idLength", idLength) : Promise.resolve()))()
		)
		const partitions = request.headers.get("partitions")?.split("/").slice(0, -1)
		!this.partitions &&
			!(this.partitions = await this.state.storage.get("partitions")) &&
			partitions &&
			this.state.waitUntil(this.state.storage.put("partitions", (this.partitions = partitions)))
	}

	async alarm(): Promise<void> {
		const archiveTime = 12 * 1000 //after settlement
		const archiveThreshold = isoly.DateTime.truncate(
			isoly.DateTime.create(Date.now() - archiveTime, "milliseconds"),
			"seconds"
		)
		this.state.blockConcurrencyWhile(async () => {
			return await this.reconcile(archiveThreshold)
		})
		// Should be set by some config
		const snooze = Date.now() + archiveTime - 7 * 1000
		await this.state.storage.setAlarm(snooze)
	}

	private async reconcile(threshold: isoly.DateTime): Promise<number> {
		const partitions = this.partitions ?? (await this.state.storage.get<string[]>("partitions")) ?? ["unkonwn"]
		const archivist = Archivist.open(this.environment.archive, this.state, partitions[0], this.idLength)
		const partitioned = partitions.length > 1 ? archivist.partition(...partitions.slice(1)) : archivist
		const stored = await partitioned.reconcile(threshold)
		return stored.length // TODO what to do if everything wasn't archived.
	}
}
