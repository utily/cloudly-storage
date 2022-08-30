import * as isoly from "isoly"
import "./load"
import "./store"
import "./remove"
import "./update"
import "./append"
import { DurableObjectState } from "../../../platform"
import { Archivist } from "./Archivist"
import { Context } from "./Context"
import { Environment } from "./Environment"

export class Backend {
	partitions: string[] | undefined
	idLength: number = 60 * 1000

	snooze: number = 60 * 1000 // make configurable
	archiveTime: number = 60 * 1000 // make configurable

	deletionTime = 60 * 1000 // hard coded. should be 5 minutes in production

	private constructor(private readonly state: DurableObjectState, private environment: Environment) {
		this.state.blockConcurrencyWhile(async () => {
			this.partitions = (await this.state.storage.get("partitions")) ?? this.partitions
			!!(await this.state.storage.getAlarm()) ||
				(await (async () => {
					await this.state.storage.setAlarm(this.snooze)
					return true
				})())
		})
	}

	async fetch(request: Request): Promise<Response> {
		this.state.waitUntil(this.configure(request))
		return this.state.blockConcurrencyWhile(() =>
			Context.handle(request, { ...(this.environment ?? {}), state: this.state })
		)
	}

	async configure(request: Request): Promise<void> {
		//TODO: Review
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
		const archiveTime = 20 * 1000 //TODO: after settlement
		const now = Date.now()
		const archiveThreshold = isoly.DateTime.truncate(
			isoly.DateTime.create(now - archiveTime, "milliseconds"),
			"seconds"
		)
		this.state.blockConcurrencyWhile(async () => {
			const idLength = this.idLength ?? (await this.state.storage.get("idLength"))
			const partitions = this.partitions ?? (await this.state.storage.get("partitions"))
			const archivist = Archivist.open(this.environment.archive, this.state, partitions ?? ["unknown"], idLength)
			return await archivist.reconcile(archiveThreshold)
		})
		// TODO: Should be set by some config
		await this.state.storage.setAlarm(this.snooze)
	}
}
