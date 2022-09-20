import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "./Context"
import { router } from "./router"

export async function load(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const storage = context.storage
	const body = await request.body
	const ids: { prefix: string[] } | string[] | string | undefined = request.parameter.id ?? (body ? body : undefined)
	if (
		ids &&
		typeof ids != "string" &&
		"prefix" in ids &&
		typeof ids.prefix != "string" &&
		Array.isArray(ids) &&
		!ids.some(id => typeof id != "string")
	)
		result = gracely.client.invalidContent(
			"ids",
			"Ids in buffer must be of type { prefix: string } | string[] | string | undefined"
		)
	else if (!storage)
		result = gracely.server.backendFailure("Failed to open Buffer Storage.")
	else {
		try {
			result = gracely.success.ok(
				await context.state.blockConcurrencyWhile(() => storage.load<Record<string, any>>(ids))
			)
		} catch (error) {
			result = gracely.server.databaseFailure(error instanceof Error ? error.message : undefined)
		}
	}
	return result
}
router.add("GET", "/buffer", load)
router.add("GET", "/buffer/:id", load)
router.add("POST", "/buffer/prefix", load)
