import * as isoly from "isoly"
import "./load"
import "./store"
import "./remove"
import "./update"
import "./append"
import { DurableObjectState } from "../../../platform"
import { Archivist } from "./Archivist"
import { Configuration } from "./Configuration"
import { Context } from "./Context"
import { Environment } from "./Environment"

export class Backend {
	private archivist: Archivist
	private configuration: Configuration
	private isAlarm: boolean
	private setAlarm = () => (this.isAlarm = true)

	private constructor(private readonly state: DurableObjectState, private environment: Environment) {}

	async fetch(request: Request): Promise<Response> {
		const result = this.state.blockConcurrencyWhile(() =>
			Context.handle(request, {
				...(this.environment ?? {}),
				state: this.state,
				alarm: { set: this.setAlarm, is: this.isAlarm },
			})
		)
		this.state.waitUntil(this.configure(request))
		return result
	}
	async configure(request: Request): Promise<void> {
		const configuration = Configuration.from(
			request,
			this.configuration ?? (await this.state.storage.get("configuration"))
		)
		if (!this.configuration) {
			await this.state.storage.put("configuration", configuration)
		}
		this.configuration = configuration
	}

	async alarm(): Promise<void> {
		const now = Date.now()
		const configuration = this.configuration ?? (await this.state.storage.get("configuration"))
		const archiveThreshold = isoly.DateTime.truncate(
			isoly.DateTime.create(now - (configuration.archiveTime ?? 60) * 1000, "milliseconds"),
			"seconds"
		)
		const archivist =
			this.archivist ??
			(this.archivist = Archivist.open(
				this.environment.archive,
				this.state,
				configuration.documentType ?? "unknown",
				configuration.partitions ?? ["unknown"]
			))
		this.state.blockConcurrencyWhile(async () => {
			const stored = await archivist.reconcile(archiveThreshold)
			if (stored?.length > 0) {
				stored?.length == archivist.configuration.limit
					? await this.state.storage.setAlarm(now + ((configuration.snooze ?? 30) * 1000) / 2)
					: stored?.length ?? 0 > 0
					? await this.state.storage.setAlarm(now + (configuration.snooze ?? 30) * 1000)
					: await this.state.storage.setAlarm(now + 2 * (configuration.snooze ?? 30) * 1000)
			} else if (
				(await this.state.storage.list({ prefix: "changed/", limit: 1 })).size == 0 &&
				(await this.state.storage.list({ prefix: "id/", limit: 1 })).size == 0 &&
				(await this.state.storage.list({ prefix: configuration.documentType + "/doc/", limit: 1 })).size == 0
			) {
				await this.state.storage.deleteAll()
				this.isAlarm = false
			}

			return stored
		})
	}
}
