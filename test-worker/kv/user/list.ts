import * as gracely from "gracely"
import * as http from "cloudly-http"
import * as storage from "cloudly-storage"
import { Context } from "../../Context"
import { router } from "../../router"

export async function list(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: any
	const kv = context.kv
	const listOption = storage.KeyValueStore.ListOptions.request(request)
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(kv))
		result = kv
	else {
		const response = await kv.list(listOption)
		result = response.cursor ? [...response, response.cursor] : response
	}
	return result
}
router.add("GET", "/kv/user", list)
