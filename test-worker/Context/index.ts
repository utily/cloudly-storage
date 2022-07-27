import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Environment } from "../Environment"
import { router } from "../router"
import { Database } from "./Database"

export class Context {
	#database?: Database | gracely.Error
	get database(): Database | gracely.Error {
		return this.#database ?? (this.#database = Database.create(this.environment))
	}
	constructor(public readonly environment: Environment) {}
	async authenticate(request: http.Request): Promise<"admin" | undefined> {
		return this.environment.adminSecret && request.header.authorization == `Basic ${this.environment.adminSecret}`
			? "admin"
			: undefined
	}
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
