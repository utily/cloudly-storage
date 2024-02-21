import { gracely } from "gracely"
import { http } from "cloudly-http"
import { Context } from "../../Context"
import * as model from "../../model"
import { router } from "../../router"

export async function replace(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const kv = context.kv
	const key = request.parameter.key
	const user = await request.body
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (!model.User.is(user))
		result = gracely.client.invalidContent("User", "Body is not a valid user.")
	else if (gracely.Error.is(kv))
		result = kv
	else if (!key)
		result = gracely.client.invalidPathArgument(
			"user/:key",
			"key",
			"string",
			"Unable to find user with that identifier."
		)
	else {
		await kv.set(key, user)
		result = gracely.success.created(user)
	}
	return result
}
router.add("PUT", "/kv/user/:key", replace)
