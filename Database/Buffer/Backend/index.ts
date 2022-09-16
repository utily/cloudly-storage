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
	private configuration: Configuration | undefined
	private isAlarm: boolean
	private setAlarm = async () => {
		console.log("this.isAlarm: ", this.isAlarm)
		console.log("this.configuration?.snooze: ", JSON.stringify(this.configuration, null, 2))
		!this.isAlarm && this.state.waitUntil(this.state.storage.setAlarm(Date.now() + (this.configuration?.snooze ?? 5)))
		return (this.isAlarm = true)
	}

	private constructor(private readonly state: DurableObjectState, private environment: Environment) {}

	async fetch(request: Request): Promise<Response> {
		await this.configure(request)
		const result = this.state.blockConcurrencyWhile(() =>
			Context.handle(request, {
				...(this.environment ?? {}),
				state: this.state,
				setAlarm: this.setAlarm,
			})
		)
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
		const archivist =
			this.archivist ??
			(this.archivist = Archivist.open(
				this.environment.archive,
				this.state,
				configuration?.documentType ?? "unknown",
				configuration?.partitions ?? ["unknown"]
			))
		this.state.blockConcurrencyWhile(async () => {
			const stored = await archivist.reconcile(
				isoly.DateTime.create(now - (configuration?.retention ?? 60), "milliseconds")
			)
			console.log("left: ", JSON.stringify(await this.state.storage.list({ prefix: "id/" }), null, 2))
			console.log("stored: ", JSON.stringify(stored, null, 2))
			console.log(
				"changed",
				JSON.stringify(
					Object.fromEntries((await this.state.storage.list({ prefix: "changed/", limit: 1 })).entries()),
					null,
					2
				)
			)
			console.log(
				"id",
				JSON.stringify(
					Object.fromEntries((await this.state.storage.list({ prefix: "id/", limit: 1 })).entries()),
					null,
					2
				)
			)

			console.log(
				"doc",
				JSON.stringify(
					Object.fromEntries(
						(await this.state.storage.list({ prefix: configuration?.documentType + "/doc/", limit: 1 })).entries()
					),
					null,
					2
				)
			)
			if (
				(stored.length == 0 && (await this.state.storage.list({ prefix: "changed/", limit: 1 })).size) == 0 &&
				(await this.state.storage.list({ prefix: "id/", limit: 1 })).size == 0 &&
				(await this.state.storage.list({ prefix: configuration?.documentType + "/doc/", limit: 1 })).size == 0
			) {
				console.log("yolo")
				await this.state.storage.deleteAll()
				this.isAlarm = false
			} else {
				stored?.length == archivist.configuration?.limit
					? await this.state.storage.setAlarm(now + (configuration?.snooze ?? 30) / 2)
					: (stored?.length ?? 0) > 0
					? await this.state.storage.setAlarm(now + (configuration?.snooze ?? 30))
					: await this.state.storage.setAlarm(now + 2 * (configuration?.snooze ?? 30))
			}

			return stored
		})
	}
}
