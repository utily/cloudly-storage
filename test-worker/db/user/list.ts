import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import * as model from "../../model"
import { router } from "../../router"

export async function list(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.User[] | gracely.Error
	const authorization = request.header.authorization
	if (!authorization)
		result = gracely.client.unauthorized()
	else
		result = gracely.server.backendFailure("Not implemented yet.")
	return result
}
router.add("GET", "/db/user", list)
