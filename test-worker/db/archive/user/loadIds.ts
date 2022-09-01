import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../../Context"
import { router } from "../../../router"

export async function loadIds(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const authorization = request.header.authorization
	const ids: string[] = await request.body
	const database = context.archive
	if (!authorization)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(database))
		result = database
	else if (!Array.isArray(ids) || ids.length == 0)
		result = gracely.client.invalidPathArgument("/db/archive/user/listIds", "ids", "string[]", "Please provide ids")
	else {
		const response = await database.users.load(ids)
		result = gracely.success.ok(response) ?? gracely.server.databaseFailure()
	}
	return result
}
router.add("POST", "/db/archive/user/loadIds", loadIds)
