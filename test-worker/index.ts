import { Context } from "./Context"
import { Environment } from "./Environment"
export { Do } from "./Context"

import "./db"
import "./do"
import "./kv"
import "./version"

export default {
	async fetch(request: Request, environment: Environment) {
		console.log("environment: ", JSON.stringify(Object.keys(environment)))
		return await Context.handle(request, environment)
	},
}
