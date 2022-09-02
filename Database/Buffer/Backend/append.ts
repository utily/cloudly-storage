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
	if (!amendment || !amendment.id)
		result = gracely.client.invalidContent("incomingDocumentument", "An update must be provided.")
	else if (!storage)
		result = gracely.server.backendFailure("Failed to open Buffer Storage.")
	else {
		try {
			const document = await storage.appendDocument<Record<string, any> & Document>(amendment, archived)
			result = gracely.success.created(document)
		} catch (error) {
			result = gracely.server.databaseFailure(error instanceof Error ? error.message : undefined)
		}
	}
	return result
}

router.add("PATCH", "/buffer/document", update)