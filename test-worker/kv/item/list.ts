import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function list(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: any
	const kv = context.kv
	const prefix = request.parameter.prefix
	const cursor = request.search.cursor
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(kv))
		result = kv
	else
		result = await kv.list({ prefix, cursor })
	return result
}
router.add("GET", "/kv/item/", list)
router.add("GET", "/kv/item/:prefix", list)
