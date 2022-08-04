import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function addGroup(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const userClient = context.do
	const body: string[] | undefined = await request.body
	const id = request.parameter.id

	const groups = body || (request.parameter.group ? [request.parameter.group] : undefined)
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (!id || id == "")
		result = gracely.client.invalidPathArgument("/do/user/:id", "id", "string", "id is required.")
	else if (body && request.parameter.group)
		result = gracely.client.invalidContent("string", "Please specify body OR path argument (not both)")
	else if (!Array.isArray(groups) || groups.some((e: any) => typeof e != "string"))
		result = gracely.client.invalidContent("string", "Please specify valid group(s) string(s).")
	else if (gracely.Error.is(userClient))
		result = userClient
	else {
		const response = await userClient.addGroup(id, groups)
		result = response
			? gracely.success.created(response)
			: gracely.server.databaseFailure("Error adding group to User's groups.")
	}
	return result
}

router.add("PATCH", "/do/user/:id/groups", addGroup)
router.add("PATCH", "/do/user/:id/groups/:group", addGroup)
