import { gracely } from "gracely"
import { http } from "cloudly-http"
import { storage } from "cloudly-storage"
import { Context } from "../Context"
import { router } from "../router"

export async function replace(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: storage.Bucket.Blob.Result<Record<string, string>> | gracely.Error
	const body = await request.body
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (!(body instanceof Blob))
		result = gracely.client.invalidContent("User", "Body is not a valid body.")
	else if (!request.parameter.id)
		result = gracely.client.invalidPathArgument("/report/:id", "id", "string", "Id to store the report under.")
	else if (gracely.Error.is(context.reports))
		result = context.reports
	else
		result =
			(await context.reports.store(request.parameter.id, body)) ??
			gracely.server.backendFailure("Failed to store report.")
	return gracely.Error.is(result) ? result : gracely.success.created(result)
}
router.add("PUT", "/report/:id", replace)
