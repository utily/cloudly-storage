import * as gracely from "gracely"
import * as http from "cloudly-http"
import * as storage from "cloudly-storage"
import { Environment } from "../../Environment"
import { router } from "./router"

export class Context {
	#alarm?: storage.DurableObject.Alarm
	get alarm(): storage.DurableObject.Alarm {
		return (this.#alarm ??= new storage.DurableObject.Alarm(this.state.storage))
	}

	constructor(public readonly environment: Environment, readonly state: DurableObjectState) {}
	static async handle(request: Request, environment: Environment, state: DurableObjectState): Promise<Response> {
		let result: http.Response
		try {
			result = await router.handle(http.Request.from(request), new Context(environment, state))
		} catch (e) {
			const details = (typeof e == "object" && e && e.toString()) || undefined
			result = http.Response.create(gracely.server.unknown(details, "exception"))
		}
		return http.Response.to(result)
	}
}
