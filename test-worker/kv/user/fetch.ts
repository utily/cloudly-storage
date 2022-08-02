import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function fetch(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: any
	const kv = context.kv
	const key = request.parameter.key
	if (!context.authenticate(request))
		result = gracely.client.unauthorized()
	else if (!key)
		result = gracely.client.invalidPathArgument("kv/user/:key", "key", "string", "A key identifier is required.")
	else if (gracely.Error.is(kv))
		result = kv
	else {
		const response = await kv.get(key)
		result =
			response ??
			gracely.client.invalidPathArgument("kv/user/:key", "key", "string", "Unable to find user with that identifier.")
	}
	return result
}
router.add("GET", "/kv/user/:key", fetch)
