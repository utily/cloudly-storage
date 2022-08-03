import * as gracely from "gracely"
import * as http from "cloudly-http"
import * as model from "../../../model"
import { Context } from "../Context"
import { router } from "../router"

export async function addGroup(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result | gracely.Error
	const state = context.state

	const id = request.parameter.id
	const newGroups = await request.body
	const newGroup = request.parameter.group

	if (gracely.Error.is(state))
		result = state
	else if (!id)
		result = gracely.server.backendFailure("id missing in database query.")
	else if (newGroups != undefined && !Array.isArray(newGroups))
		result = gracely.client.invalidContent("string", "Body does not contain a valid group")
	else if (!newGroups == !newGroup)
		result = gracely.client.invalidContent("string", "Please specify body or path argument, not both.")
	else if ((Array.isArray(newGroups) ? newGroups : [newGroup]).some((e: any) => typeof e != "string"))
	//else if ((newGroups ?? [newGroup]).some((e: any) => typeof e != "string"))
		result = gracely.client.invalidContent("string", "Please specify groups that are strings or a single string.")
	else
		try {
			const user = await state.storage.get<model.User>(id)
			if (!user)
				result = gracely.client.notFound("User not found in database.")
			else {
				console.log("durable object id", id)
				console.log("user after before", user)
				;(newGroups ?? [newGroup]).forEach((e: any) => user.groups.push(e))
				await state.storage.put(id, user)
				result = gracely.success.ok(user)
			}
		} catch (error) {
			result = gracely.server.databaseFailure(error instanceof Error ? error.message : undefined)
		}
	console.log("inside of durable object:", result)
	console.log(result)
	return result
}
router.add("PATCH", "/user/:id/groups", addGroup)
// router.add("PATCH", "/user/:id/groups/:group", addGroup)
