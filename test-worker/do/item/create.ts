import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const body = await request.body

	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (!body || typeof body != "string")
		return gracely.client.invalidContent("Item", "Item to add.")
	else if (gracely.Error.is(context.items))
		result = context.items
	else {
		const response = await context.items.create(body)
		result = gracely.Error.is(response) ? response : gracely.success.created(response)
	}
	return result
}
router.add("POST", "/do/item", create)
