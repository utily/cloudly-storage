import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import * as model from "../../model"
import { router } from "../../router"

export async function list(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.User[] | any | gracely.Error
	const authorization = request.header.authorization
	const database = context.database
	if (!authorization)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(database))
		result = database
	else
		result = database.users.load()
	return result
}
router.add("GET", "/db/user", list)
