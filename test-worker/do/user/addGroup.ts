import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

// interface Group {
// 	group: string
// }

// function isGroup(value: any): value is Group {
// 	return typeof value == "object" && value && typeof value.group == "string"
// }

export async function addGroup(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const userClient = context.do
	const id = request.parameter.id
	const newGroups = await request.body
	const newGroup = request.parameter.group
	console.log(newGroup)
	console.log(newGroups)
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (!id || id == "")
		result = gracely.client.invalidPathArgument("/do/user/:id", "id", "string", "id is required.")
	else if (!newGroups == !newGroup)
		result = gracely.client.invalidContent("string", "Please specify body or path argument, not both.")
	else if ((Array.isArray(newGroups) ? newGroups : [newGroup]).some((e: any) => typeof e != "string"))
		result = gracely.client.invalidContent("string", "Please specify groups that are strings or a single string.")
	else if (gracely.Error.is(userClient))
		result = userClient
	else {
		console.log("there!")
		const response = await userClient.addGroup(id, newGroups ?? newGroup)
		console.log("id", id)
		console.log("response", response)
		result = response
			? gracely.success.created(response)
			: gracely.server.databaseFailure("Error adding group to User's groups.")
	}
	return result
}

router.add("PATCH", "/do/user/:id/groups", addGroup)
router.add("PATCH", "/do/user/:id/groups/:group", addGroup)
