import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Document } from "../../Document"
import { Context } from "./Context"
import { router } from "./router"

export async function update(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const body = await request.body
	const amendment = body?.amendment
	const archived = body?.archived
	const storage = context.storage
	const unlock = request.header.unlock == "true" || undefined
	if (!amendment || !amendment.id)
		result = gracely.client.invalidContent("Partial<Document>", "The body must contain a Partial<Document>")
	else if (!storage)
		result = gracely.server.backendFailure("Failed to open Buffer Storage.")
	else {
		try {
			const document = await context.state.blockConcurrencyWhile(() =>
				storage.changeDocument<Record<string, any> & Document>(
					amendment,
					request.method == "PUT" ? "update" : "append",
					archived,
					unlock
				)
			)
			result = gracely.success.created(document)
			context.state.waitUntil(context.setAlarm())
		} catch (error) {
			result = gracely.server.databaseFailure(error instanceof Error ? error.message : undefined)
		}
	}
	return result
}

router.add("PATCH", "/buffer/document", update)
router.add("PUT", "/buffer/document", update)
