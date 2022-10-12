import { Context, Do } from "./Context"
import { Environment } from "./Environment"

import "./db"
import "./do"
import "./kv"
import "./version"

export async function fetch(request: Request, environment: Environment) {
	return await Context.handle(request, environment)
}

const worker: ExportedHandler<Environment> = { fetch }
export default worker
export { Backend } from "cloudly-storage"
export { Do }
