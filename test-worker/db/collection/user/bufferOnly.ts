import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../../Context"
import { router } from "../../../router"

export async function list(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: (gracely.Result & { header: Record<string, string | undefined> }) | gracely.Error
	const authorization = request.header.authorization
	const database = context.collection
	if (!authorization)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(database))
		result = database
	else {
		const listed = await database.users.bufferOnly()
		const response = gracely.success.ok(listed) ?? gracely.server.databaseFailure()
		result = { ...response, header: { ...response.header, locus: listed.locus } }
	}
	return result
}
router.add("GET", "/db/collection/user/bufferOnly", list)
