import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../../Context"
import * as model from "../../../model"
import { router } from "../../../router"

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const database = context.collection
	const user: model.User = await request.body
	const partition = request.search.partition
	console.log("dwadwa")
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if ((!Array.isArray(user) && !model.User.is(user)) || (Array.isArray(user) && user.some(u => !model.User.is(u))))
		result = gracely.client.invalidContent("user", "Body is not a valid user.")
	else if (gracely.Error.is(database))
		result = database
	else {
		const partitioned = partition ? database.partition(partition) : database
		const response = Array.isArray(user) ? await partitioned.users.replace(user) : await partitioned.users.replace(user)
		result = response ? gracely.success.created(response) : gracely.server.databaseFailure()
	}
	return result
}
router.add("PUT", "/db/collection/user", create)
