import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../../Context"
import { router } from "../../../router"

export async function append(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const database = context.collection
	const partition = request.search.partition
	const user = await request.body
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if ((!Array.isArray(user) && !user.id) || (Array.isArray(user) && user.some(u => !u.id)))
		result = gracely.client.invalidContent("user", "To append please provide a valid user.")
	else if (gracely.Error.is(database))
		result = database
	else {
		const partitioned = partition ? database.partition(partition) : database
		const response = await partitioned.users.update(user, "operation", true)
		result = response
			? gracely.success.created(response)
			: gracely.server.databaseFailure("Unable to append to user, probably doesn't exists.")
	}
	return result
}
router.add("PUT", "/db/collection/user", append)
