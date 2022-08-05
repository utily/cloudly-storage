import * as gracely from "gracely"
import * as http from "cloudly-http"
import * as model from "../../../model"
import { Context } from "../Context"
import { router } from "../router"

export async function modifyLevel(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result | gracely.Error
	const state = context.state
	const id = request.parameter.id
	const value: number | undefined = await request.body

	if (gracely.Error.is(state))
		result = state
	else if (!id)
		result = gracely.server.backendFailure("id missing in database query.")
	else if (!value || typeof value != "number")
		result = gracely.server.backendFailure("string", "Value corrupted during redirects.")
	else
		try {
			const user = await state.storage.get<model.User>(id)
			if (!user)
				result = gracely.client.notFound("User not found in database.")
			else {
				user.level = user.level + value < 0 ? 0 : user.level + value
				await state.storage.put(id, user)
				result = gracely.success.ok(user)
			}
		} catch (error) {
			result = gracely.server.databaseFailure(error instanceof Error ? error.message : undefined)
		}
	return result
}
router.add("PATCH", "/user/:id/level", modifyLevel)
