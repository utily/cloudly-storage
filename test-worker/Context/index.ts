import * as gracely from "gracely"
import * as http from "cloudly-http"
import * as storage from "cloudly-storage"
import { Environment } from "../Environment"
import * as model from "../model"
import { router } from "../router"
import { Database } from "./Database"
import { Do, UserClient } from "./Do"
export { Do }

export class Context {
	#do?: UserClient | gracely.Error
	get do(): UserClient | gracely.Error {
		return (
			this.#do ??
			(this.#do =
				UserClient.open(storage.DurableObject.Namespace.open(this.environment.Do)) ??
				gracely.server.misconfigured("Do", "DurableObjectNamespace missing."))
		)
	}
	#kv?: storage.KeyValueStore<model.User> | gracely.Error
	get kv(): storage.KeyValueStore<model.User> | gracely.Error {
		return (
			this.#kv ??
			(this.#kv = this.environment.kvStore
				? storage.KeyValueStore.Json.create(this.environment.kvStore)
				: gracely.server.misconfigured("kvStore", "KeyValueNamespace missing."))
		)
	}
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
