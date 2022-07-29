import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "./Context"
import { router } from "./router"

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const item = await request.body
	const state = context.state
	if (!item)
		result = gracely.client.invalidContent("Item", "Body is not a valid item.")
	else if (gracely.Error.is(state))
		result = state
	else {
		try {
			await state.storage.put(item.id, item)
			result = gracely.success.created(item)
		} catch (error) {
			result = gracely.server.databaseFailure(error instanceof Error ? error.message : undefined)
		}
	}
	return result
}
router.add("POST", "/do/item", create)
