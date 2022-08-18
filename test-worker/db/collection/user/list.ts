import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../../Context"
import * as model from "../../../model"
import { router } from "../../../router"

export async function list(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.User[] | any | gracely.Error
	const authorization = request.header.authorization
	const database = context.collection
	if (!authorization)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(database))
		result = database
	else
		result = await database.users.partition("test").load()
	return result
}
router.add("GET", "/db/collection/user", list)
