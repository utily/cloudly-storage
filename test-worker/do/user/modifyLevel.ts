import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function modifyLevel(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const userClient = context.do
	const body: { addend: number } | undefined = await request.body
	const id = request.parameter.id
	if (!body || body.addend == undefined)
		result = gracely.client.unauthorized()
	//fix this
	else if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(userClient))
		result = userClient
	else if (!id || id == "")
		result = gracely.client.invalidPathArgument("/do/user/:id", "id", "string", "A valid id is required.")
	else if (typeof body.addend != "number")
		result = gracely.client.invalidContent("string", "Input must be a number")
	else {
		const response = await userClient.modifyLevel(id, body.addend)
		result = response ? gracely.success.created(response) : gracely.server.databaseFailure("Error modifying level.")
	}
	return result
}

router.add("PATCH", "/do/user/:id/level", modifyLevel)
