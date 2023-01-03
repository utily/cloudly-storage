import * as isoly from "isoly"
import * as http from "cloudly-http"
import { Document } from "../../Document"
import { Context } from "./Context"
import { error } from "./error"
import { router } from "./router"

export async function load(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: (Document & Record<string, any>) | (Document & Record<string, any>)[] | Error
	const storage = context.storage
	const body = await request.body
	const ids: { prefix: string[]; limit?: number } | string[] | string | undefined =
		request.parameter.id ?? (body ? body : undefined)
	const lock: isoly.DateTime | undefined = isoly.DateTime.is(request.header.lock) ? request.header.lock : undefined
	if (
		!(
			!ids ||
			typeof ids == "string" ||
			(Array.isArray(ids) && ids.every(e => typeof e == "string")) ||
			("prefix" in ids && ids.prefix.every(e => typeof e == "string"))
		)
	)
		result = error(
			"load",
			"Ids in buffer must be of type { prefix: string[], limit?: number } | string[] | string | undefined"
		)
	else if (lock && !isoly.DateTime.is(lock)) {
		result = error("load", "Header lock must be of type isoly.Timespan | undefined.")
	} else if (!storage)
		result = error("load", "Failed to open Buffer Storage.")
	else {
		try {
			result =
				(await storage.load<Document & Record<string, any>>(ids, lock)) ?? error("load", "Document locked or not found")
		} catch (e) {
			result = error("load", e)
		}
	}
	return result
}
router.add("GET", "/buffer", load)
router.add("GET", "/buffer/:id", load)
router.add("POST", "/buffer/prefix", load)
