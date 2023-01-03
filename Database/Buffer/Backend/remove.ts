import * as http from "cloudly-http"
import { Error } from "../../../Error"
import { Context } from "./Context"
import { error } from "./error"
import { router } from "./router"

export async function remove(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: boolean | boolean[] | Error
	const ids: string[] = await request.body
	const id: string | undefined = request.parameter.id
	const storage = context.storage
	if (!ids && !id)
		result = error("remove", "Must specify id or ids.")
	else if (typeof id != "string" && (!Array.isArray(ids) || ids.some(e => typeof e != "string")))
		result = error("remove", "id must be a string and ids must be a string[].")
	else if (!storage)
		result = error("remove", "Failed to open Buffer Storage.")
	else {
		try {
			result = await context.state.blockConcurrencyWhile(() => storage.removeDocuments(id ?? ids))
		} catch (error) {
			result = error("remove", error)
		}
	}
	return result
}

router.add("DELETE", "/buffer/:id", remove)
router.add("POST", "/buffer/delete", remove)
