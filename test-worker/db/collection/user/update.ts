import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../../Context"
import * as model from "../../../model"
import { router } from "../../../router"

export async function update(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const database = context.collection
	const user = await request.body
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (!model.User.is(user))
		result = gracely.client.invalidContent("user", "To update please provide a valid user.")
	else if (gracely.Error.is(database))
		result = database
	else {
		const response = await database.users.update(user)
		result = response
			? gracely.success.created(response)
			: gracely.server.databaseFailure("Unable to update user, probably doesn't exists.")
	}
	return result
}
router.add("PUT", "/db/collection/user", update)
