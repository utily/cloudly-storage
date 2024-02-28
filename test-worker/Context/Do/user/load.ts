import { gracely } from "gracely"
import { http } from "cloudly-http"
import * as model from "../../../model"
import { Context } from "../Context"
import { router } from "../router"

export async function load(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.User | gracely.Error
	const state = context.state
	const id = request.parameter.id
	if (gracely.Error.is(state))
		result = state
	else if (!id)
		result = gracely.server.backendFailure("id missing in database query.")
	else
		try {
			result = (await state.storage.get<model.User>(id)) ?? gracely.client.notFound("User not found in database.")
		} catch (error) {
			result = gracely.server.databaseFailure(error instanceof Error ? error.message : undefined)
		}

	return result
}
router.add("GET", "/user/:id", load)
