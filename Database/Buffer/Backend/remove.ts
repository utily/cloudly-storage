import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "./Context"
import { router } from "./router"

export async function remove(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const ids: string[] = await request.body
	const id: string | undefined = request.parameter.id
	const storage = context.storage
	if (!ids && !id)
		result = gracely.client.invalidContent("id | ids", "Must specify id or ids.")
	else if (typeof id != "string" && (!Array.isArray(ids) || ids.some(e => typeof e != "string")))
		result = gracely.client.invalidContent("id | ids", "id must be a string and ids must be a string[].")
	else if (!storage)
		result = gracely.server.backendFailure("Failed to open Buffer Storage.")
	else {
		try {
			result = gracely.success.ok(await storage.removeDocuments(id ?? ids))
		} catch (error) {
			result = gracely.server.databaseFailure(error instanceof Error ? error.message : undefined)
		}
	}
	return result
}

router.add("DELETE", "/buffer/:id", remove)
router.add("POST", "/buffer/delete", remove)
