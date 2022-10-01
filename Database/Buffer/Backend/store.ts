import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "./Context"
import { router } from "./router"

export async function store(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const document: Record<string, any> = await request.body
	const storage = context.storage
	console.log("djiajdi: ", document)
	if (!document)
		result = gracely.client.invalidContent("Item", "Body is not a valid Document.")
	else if (!storage)
		result = gracely.server.backendFailure("Failed to open Buffer Storage.")
	else {
		try {
			result = gracely.success.created(
				await context.state.blockConcurrencyWhile(() => storage.storeDocuments(document))
			)
			context.state.waitUntil(context.setAlarm())
		} catch (error) {
			result = gracely.server.databaseFailure(error instanceof Error ? error.message : undefined)
		}
	}
	return result
}

router.add("POST", "/buffer", store)
