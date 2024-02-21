import { gracely } from "gracely"
import { http } from "cloudly-http"
import { Context } from "../../Context"
import * as model from "../../model"
import { router } from "../../router"

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const users = context.users
	const user = await request.body
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (!model.User.is(user))
		result = gracely.client.invalidContent("User", "Body is not a valid user.")
	else if (gracely.Error.is(users))
		result = users
	else {
		const response = await users.create(user)
		result = !gracely.Error.is(response) ? gracely.success.created(response) : gracely.server.databaseFailure()
	}
	return result
}
router.add("POST", "/do/user", create)
