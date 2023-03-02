import * as gracely from "gracely"
import * as http from "cloudly-http"
import * as storage from "cloudly-storage"
import { Environment } from "../Environment"
import * as model from "../model"
import { router } from "../router"
import { Archive } from "./Archive"
import { Collection } from "./Collection"
import { Do, UserClient } from "./Do"
export { Do }

export class Context {
	#users?: UserClient | gracely.Error
	get users(): UserClient | gracely.Error {
		return (this.#users ??=
			UserClient.open(storage.DurableObject.Namespace.open(this.environment.Do)) ??
			gracely.server.misconfigured("Do", "DurableObjectNamespace missing."))
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
	#collection?: Collection | gracely.Error
	get collection(): Collection | gracely.Error {
		return (
			this.#collection ??
			(this.#collection =
				Collection.create(this.environment) ?? gracely.server.databaseFailure("Failed to open collection."))
		)
	}
	#archive?: Archive | gracely.Error
	get archive(): Archive | gracely.Error {
		return (
			this.#archive ??
			(this.#archive =
				Archive.create(this.environment)?.partition("testtest") ??
				gracely.server.databaseFailure("Failed to open archive."))
		)
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
