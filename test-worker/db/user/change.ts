import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import * as model from "../../model"
import { router } from "../../router"

export async function change(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.User | gracely.Error
	const id = request.parameter.id
	const user = await request.body
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (!id || id.length != 1 || id < "a" || id > "f")
		result = gracely.client.invalidPathArgument("user/:id", "id", "string", "A valid identifier is required.")
	else if (!model.User.is(user))
		result = gracely.client.invalidContent("user", "Body is not a valid user.")
	else
		result = { ...user, id }
	return result
}
router.add("PATCH", "/db/user/:id", change)
