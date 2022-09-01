import * as cryptly from "cryptly"
import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../../Context"
import * as model from "../../../model"
import { router } from "../../../router"

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const database = context.collection
	const user: model.User = await request.body
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (!model.User.is(user))
		result = gracely.client.invalidContent("user", "Body is not a valid user.")
	else if (gracely.Error.is(database))
		result = database
	else {
		const users = [user]
		for (let index = 0; index < 9; index++) {
			users.push({ ...user, id: "qq" + cryptly.Identifier.generate(4).substring(2) })
		}
		const response = Array.isArray(users) ? await database.users.store(users) : await database.users.store(user)
		result = response ? gracely.success.created(response) : gracely.server.databaseFailure()
	}
	return result
}
router.add("POST", "/db/collection/user", create)
