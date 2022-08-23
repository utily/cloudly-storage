import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "./Context"
import { router } from "./router"

export async function store(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const document = await request.body
	const key = request.parameter.key ? decodeURIComponent(request.parameter.key) : undefined
	const storage = context.storage
	if (!document)
		result = gracely.client.invalidContent("Item", "Body is not a valid item.")
	else if (!key)
		result = gracely.client.invalidPathArgument("/buffer/:key", "key", "string", "The buffer requires a key.")
	else if (!storage)
		result = gracely.server.backendFailure("Failed to open Buffer Storage.")
	else {
		try {
			await storage.store(key, document)
			result = gracely.success.created(document)
		} catch (error) {
			result = gracely.server.databaseFailure(error instanceof Error ? error.message : undefined)
		}
	}
	return result
}
router.add("POST", "/buffer/:key", store)
