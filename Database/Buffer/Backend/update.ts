import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Document } from "../../Document"
import { Context } from "./Context"
import { router } from "./router"

export async function update(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const id = request.parameter.id
	const body = await request.body
	const incomingDocument = body.incomingDocument
	const archiveDocument = body?.archiveDocument
	const storage = context.storage
	if (!id || !incomingDocument)
		result = gracely.client.invalidContent("incomingDocumentument", "An update must be provided.")
	else if (!storage)
		result = gracely.server.backendFailure("Failed to open Buffer Storage.")
	else {
		try {
			const document = await storage.updateDocument<Record<string, any> & Document>(incomingDocument, archiveDocument)
			result = gracely.success.created(document)
		} catch (error) {
			result = gracely.server.databaseFailure(error instanceof Error ? error.message : undefined)
		}
	}
	return result
}

router.add("PUT", "/buffer/document/:id", update)
