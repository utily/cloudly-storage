import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../../Context"
import { router } from "../../../router"

export async function append(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const database = context.collection
	const user = await request.body
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (!(typeof user.id == "string") || !(user.id.length == 4))
		result = gracely.client.invalidContent("user", "To append please provide a valid user.")
	else if (gracely.Error.is(database))
		result = database
	else {
		const response = await database.users.append(user)
		result = response
			? gracely.success.created(response)
			: gracely.server.databaseFailure("Unable to append to user, probably doesn't exists.")
	}
	return result
}
router.add("PATCH", "/db/collection/user", append)
