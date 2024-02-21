import { http } from "cloudly-http"
import { Status } from "../Status"
import { Context } from "./Context"
import { error } from "./error"
import { router } from "./router"

export async function status(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: Status | Record<string, unknown> | Error
	const storage = context.storage
	const body = await request.body
	if (!storage)
		result = error("status", "Failed to open Buffer Storage.")
	if (!Status.Options.is(body))
		result = error("status", "Body needs to have type Options")
	else {
		try {
			result = (await storage.status(body)) ?? error("status", "Failed to fetch status")
		} catch (e) {
			result = error("status", e)
		}
	}
	return result
}
router.add("POST", "/buffer/status", status)
