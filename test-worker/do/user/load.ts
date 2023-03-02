import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import * as model from "../../model"
import { router } from "../../router"

export async function load(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.User | gracely.Error
	const authorization = request.header.authorization
	const userClient = context.users
	const id = request.parameter.id
	if (!authorization)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(userClient))
		result = userClient
	else if (!id || id == "")
		result = gracely.client.invalidPathArgument("/do/user/:id", "id", "string", "id is required")
	else
		result = await userClient.load(id)
	return result
}
router.add("GET", "/do/user/:id", load)
