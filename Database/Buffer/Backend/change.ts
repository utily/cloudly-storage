import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Document } from "../../Document"
import { Context } from "./Context"
import { router } from "./router"

export async function update(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const body = await request.body
	const prefix =
		typeof request.header.documentType == "string" && typeof request.header.partitions == "string"
			? request.header.documentType + "/doc/" + request.header.partitions
			: undefined
	const storage = context.storage
	const unlock = request.header.unlock == "true" || undefined
	if (!body)
		result = gracely.client.invalidContent("Partial<Document>[]", "The body must contain a Partial<Document>[]")
	else if (!storage)
		result = gracely.server.backendFailure("Failed to open Buffer Storage.")
	else if (!prefix)
		result = gracely.client.missingHeader(
			"document-type || partitions",
			"document-type and partitions need to be specified as strings."
		)
	else {
		try {
			const document = await context.state.blockConcurrencyWhile(() =>
				storage.changeDocuments<Record<string, any> & Document>(
					body,
					request.method == "PUT" ? "update" : "append",
					prefix,
					unlock
				)
			)
			result = gracely.success.ok(document)
			context.state.waitUntil(context.setAlarm())
		} catch (error) {
			result = gracely.server.databaseFailure(error instanceof Error ? error.message : undefined)
		}
	}
	return result
}

router.add("PUT", "/buffer/documents", update)
router.add("PATCH", "/buffer/documents", update)
