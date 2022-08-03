import * as gracely from "gracely"
import * as http from "cloudly-http"
import { DurableObjectState } from "../../../platform"
import { Environment } from "./Environment"
import { router } from "./router"

export class Context {
	#state?: DurableObjectState | gracely.Error
	get state() {
		return (
			this.#state ??
			(this.#state = this.environment.state
				? this.environment.state
				: gracely.server.misconfigured("databaseStore", "KeyValueNamespace missing."))
		)
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
