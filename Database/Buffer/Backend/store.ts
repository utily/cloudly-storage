import { http } from "cloudly-http"
import { Error } from "../../../Error"
import { Context } from "./Context"
import { error } from "./error"
import { router } from "./router"

export async function store(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: Record<string, any> | Record<string, any>[] | Error
	const document: Record<string, any> = await request.body
	const storage = context.storage
	if (!document)
		result = error("store", "Body is not a valid item.")
	else if (!storage)
		result = error("store", "Failed to open Buffer Storage.")
	else {
		try {
			result = await context.state.blockConcurrencyWhile(() => storage.storeDocuments(document))
			context.state.waitUntil(context.setAlarm())
		} catch (e) {
			result = error("store", e)
		}
	}
	return result
}

router.add("POST", "/buffer", store)
