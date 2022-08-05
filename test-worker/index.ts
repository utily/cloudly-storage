import { Context } from "./Context"
import { Environment } from "./Environment"
export { Backend } from "cloudly-storage"

import "./db"
import "./do"
import "./kv"
import "./version"

export default {
	async fetch(request: Request, environment: Environment) {
		return await Context.handle(request, environment)
	},
}
