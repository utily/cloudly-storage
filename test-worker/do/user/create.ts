import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import * as model from "../../model"
import { router } from "../../router"

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const userClient = context.do
	const user = await request.body
	console.log("hej")
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (!model.User.is(user))
		result = gracely.client.invalidContent("User", "Body is not a valid user.")
	else if (gracely.Error.is(userClient))
		result = userClient
	else {
		const response = await userClient.create(user)
		result = response ? gracely.success.created(response) : gracely.server.databaseFailure()
	}
	return result
}
router.add("POST", "/do/user", create)
