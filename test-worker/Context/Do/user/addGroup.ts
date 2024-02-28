import { gracely } from "gracely"
import { http } from "cloudly-http"
import * as model from "../../../model"
import { Context } from "../Context"
import { router } from "../router"

export async function addGroup(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result | gracely.Error
	const state = context.state
	const id = request.parameter.id
	const groups: string[] | undefined = await request.body

	if (gracely.Error.is(state))
		result = state
	else if (!id)
		result = gracely.server.backendFailure("id missing in database query.")
	else if (!Array.isArray(groups))
		result = gracely.client.invalidContent("string", "Body does not contain a valid group")
	else if (Array.isArray(groups) && groups.some((e: any) => typeof e != "string"))
		result = gracely.client.invalidContent("string", "Please specify valid group(s) string(s).")
	else
		try {
			const user = await state.storage.get<model.User>(id)
			if (!user)
				result = gracely.client.notFound("User not found in database.")
			else {
				groups.forEach(e => !user.groups.includes(e) && user.groups.push(e))
				await state.storage.put(id, user)
				result = gracely.success.ok(user)
			}
		} catch (error) {
			result = gracely.server.databaseFailure(error instanceof Error ? error.message : undefined)
		}
	return result
}
router.add("PATCH", "/user/:id/groups", addGroup)
