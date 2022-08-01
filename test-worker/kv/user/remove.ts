import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function remove(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const kv = context.kv
	const key = request.parameter.key
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(kv))
		result = kv
	else if (!key)
		result = gracely.client.invalidPathArgument(
			"user/:key",
			"key",
			"string",
			"Key of user to delete is missing from path."
		)
	else {
		await kv.set(key)
		result = gracely.success.noContent()
	}
	return result
}
router.add("DELETE", "/kv/user/:key", remove)
