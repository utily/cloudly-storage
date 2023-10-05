import * as gracely from "gracely"
import * as http from "cloudly-http"
import { storage } from "cloudly-storage"
import { Context } from "../Context"
import { router } from "../router"

export async function fetch(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: storage.Bucket.Blob.Result<Record<string, string>> | gracely.Error
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (!request.parameter.id)
		result = gracely.client.invalidPathArgument("/report/:id", "id", "string", "Id to store the report under.")
	else if (gracely.Error.is(context.reports))
		result = context.reports
	else
		result =
			(await context.reports.get(request.parameter.id)) ??
			gracely.client.notFound(`Report with id: ${request.parameter.id}`)
	return result
}
router.add("GET", "/report/:id", fetch)
