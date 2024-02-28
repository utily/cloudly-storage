import { http } from "cloudly-http"
import { Document } from "../../Document"
import { Context } from "./Context"
import { error } from "./error"
import { router } from "./router"

export async function update(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: (Record<string, any> & Document) | ((Record<string, any> & Document) | Error)[] | Error
	const body = await request.body
	const prefix =
		typeof request.header.documentType == "string" && typeof request.header.partitions == "string"
			? request.header.documentType + "/doc/" + request.header.partitions
			: undefined
	const storage = context.storage
	const unlock = request.header.unlock == "true" || undefined
	const index = Array.isArray(request.header.updateIndex) ? request.header.updateIndex[0] : request.header.updateIndex
	if (!body)
		result = error("update", "The body must contain a Partial<Document>[]")
	else if (!storage)
		result = error("update", "Failed to open Buffer Storage.")
	else if (!prefix)
		result = error("update", "document-type and partitions need to be specified as strings.")
	else {
		try {
			result =
				(await context.state.blockConcurrencyWhile(() => storage.update(body, prefix, index, unlock))) ??
				error("update", "Document not found")
			context.state.waitUntil(context.setAlarm())
		} catch (e) {
			result = error("update", e)
		}
	}
	return result
}

router.add("PUT", "/buffer/documents", update)
