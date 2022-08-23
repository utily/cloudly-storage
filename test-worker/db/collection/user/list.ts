import * as gracely from "gracely"
import * as http from "cloudly-http"
import * as Storage from "cloudly-storage"
import { Context } from "../../../Context"
import * as model from "../../../model"
import { router } from "../../../router"

export async function list(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.User[] | any | gracely.Error
	const body: Storage.Selection | undefined = await request.body
	const authorization = request.header.authorization
	const database = context.collection
	if (!authorization)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(database))
		result = database
	else
		result = body ? await database.users.load(body) : await database.users.load()
	return result
}
router.add("GET", "/db/collection/user", list)
router.add("POST", "/db/collection/user/prefix", list)
