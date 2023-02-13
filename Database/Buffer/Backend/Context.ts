import * as gracely from "gracely"
import * as platform from "@cloudflare/workers-types"
import * as http from "cloudly-http"
import { Environment } from "./Environment"
import { router } from "./router"
import { Storage } from "./Storage"

export class Context {
	#setAlarm?: () => Promise<void>
	get setAlarm(): () => Promise<void> {
		return (this.#setAlarm ??= this.environment.setAlarm)
	}
	#state?: platform.DurableObjectState
	get state() {
		return this.#state ?? (this.#state = this.environment.state)
	}
	#storage?: Storage
	get storage() {
		return this.#storage ?? (this.#storage = Storage.open(this.environment.state))
	}
	constructor(public readonly environment: Environment) {}
	static async handle(request: Request, environment: Environment): Promise<Response> {
		let result: http.Response
		try {
			result = await router.handle(http.Request.from(request), new Context(environment))
		} catch (e) {
			const details = (typeof e == "object" && e && e.toString()) || undefined
			result = http.Response.create(gracely.server.unknown(details, "exception"))
		}
		return http.Response.to(result)
	}
}
