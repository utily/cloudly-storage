import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "./Context"
import { router } from "./router"

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const user = await request.body
	const state = context.state
	if (!user)
		result = gracely.client.invalidContent("user", "Body is not a valid user.")
	else if (gracely.Error.is(state))
		result = state
	else {
		try {
			await state.storage.put(user.id, user)
			result = gracely.success.created(user)
		} catch (error) {
			result = gracely.server.databaseFailure(error instanceof Error ? error.message : undefined)
		}
	}
	return result
}
router.add("POST", "/do/user", create)
