import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function list(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: Blob[] | gracely.Error
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(context.reports))
		result = context.reports
	else
		result = await context.reports.list()
	return result
}
router.add("GET", "/report", list)
