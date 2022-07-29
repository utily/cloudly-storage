import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import * as model from "../../model"
import { router } from "../../router"

export async function replace(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const kv = context.kv
	const key = request.parameter.key
	const item = await request.body
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (!model.Item.is(item))
		result = gracely.client.invalidContent("Item", "Body is not a valid item.")
	else if (gracely.Error.is(kv))
		result = kv
	else if (!key)
		result = gracely.client.invalidPathArgument(
			"item/:key",
			"key",
			"string",
			"Unable to find item with that identifier."
		)
	else {
		await kv.set(key, item)
		result = gracely.success.created(item)
	}
	return result
}
router.add("PUT", "/kv/item/:key", replace)
