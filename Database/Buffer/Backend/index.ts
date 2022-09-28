import * as isoly from "isoly"
import "./load"
import "./store"
import "./remove"
import "./changeMany"
import "./change"
import { DurableObjectState } from "../../../platform"
import { Archivist } from "./Archivist"
import { Configuration } from "./Configuration"
import { Context } from "./Context"
import { Environment } from "./Environment"

export class Backend {
	private archivist: Archivist
	private configuration: Configuration | undefined
	private isAlarm: boolean
	private setAlarm = async () => {
		!this.isAlarm &&
			this.state.waitUntil(this.state.storage.setAlarm(Date.now() + (this.configuration?.snooze ?? 10000)))
		return (this.isAlarm = true)
	}

	private constructor(private readonly state: DurableObjectState, private environment: Environment) {}

	async fetch(request: Request): Promise<Response> {
		await this.configure(request)
		return Context.handle(request, {
			...(this.environment ?? {}),
			state: this.state,
			setAlarm: this.setAlarm,
		})
	}
	async configure(request: Request): Promise<void> {
		const configuration = Configuration.from(
			request,
			this.configuration ?? (await this.state.storage.get("configuration"))
		)
		if (!this.configuration)
			await this.state.storage.put("configuration", configuration)
		this.configuration = configuration
	}

	async alarm(): Promise<void> {
		const now = Date.now()
		const configuration = {
			...Configuration.standard,
			...(this.configuration ?? (await this.state.storage.get("configuration")) ?? {}),
		}
		const archivist =
			this.archivist ?? (this.archivist = Archivist.open(this.environment.archive, this.state, configuration))
		this.state.blockConcurrencyWhile(async () => {
			const stored = await archivist.reconcile(isoly.DateTime.create(now, "milliseconds"))
			if (
				(stored.length == 0 && (await this.state.storage.list({ prefix: "changed/", limit: 1 })).size) == 0 &&
				(await this.state.storage.list({ prefix: "id/", limit: 1 })).size == 0 &&
				(await this.state.storage.list({ prefix: configuration?.documentType + "/doc/", limit: 1 })).size == 0
			) {
				await this.state.storage.deleteAll()
				this.isAlarm = false
			} else {
				stored?.length == archivist?.limit
					? await this.state.storage.setAlarm(now + (configuration?.snooze ?? 30000) / 2)
					: (stored?.length ?? 0) > 0
					? await this.state.storage.setAlarm(now + (configuration?.snooze ?? 300000))
					: await this.state.storage.setAlarm(now + 2 * (configuration?.snooze ?? 300000))
			}
			return stored
		})
	}
}
