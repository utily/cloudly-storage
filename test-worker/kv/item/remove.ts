import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function remove(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const kv = context.kv
	const id = request.parameter.id
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(kv))
		result = kv
	else if (!id)
		result = gracely.client.invalidContent("Id", "id id id")
	else {
		// TODO: await kv.set(id)
		result = gracely.success.noContent()
	}
	return result
}
router.add("DELETE", "/kv/item/:id", remove)
