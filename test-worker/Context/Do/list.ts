import * as gracely from "gracely"
import * as http from "cloudly-http"
import * as model from "../../model"
import { Context } from "./Context"
import { router } from "./router"

export async function list(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.User[] | gracely.Error
	const state = context.state
	if (gracely.Error.is(state))
		result = state
	else {
		try {
			const response = await state.storage.list<model.User>()
			result = Array.from(response.values())
		} catch (error) {
			result = gracely.server.databaseFailure(error instanceof Error ? error.message : undefined)
		}
	}
	return result
}
router.add("GET", "/do/user", list)
