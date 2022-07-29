import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function list(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: any
	const kv = context.kv
	const prefix = request.search.prefix
	const limit = request.search.limit
	const cursor = request.search.cursor
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(kv))
		result = kv
	else {
		const response = await kv.list({ prefix, limit: (limit && Number.parseInt(limit)) || undefined, cursor })
		result = response.cursor ? [...response, response.cursor] : response
	}
	return result
}
router.add("GET", "/kv/item", list)
