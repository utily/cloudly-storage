import { gracely } from "gracely"
import { http } from "cloudly-http"
import { Context } from "../../Context"
import * as model from "../../model"
import { router } from "../../router"

export async function loadAll(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.User[] | gracely.Error
	const authorization = request.header.authorization
	const userClient = context.users
	if (!authorization)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(userClient))
		result = userClient
	else {
		result = await userClient.list()
	}
	return result
}
router.add("GET", "/do/user", loadAll)
