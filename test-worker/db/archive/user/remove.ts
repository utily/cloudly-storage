import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../../Context"
import { router } from "../../../router"

export async function remove(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result | gracely.Error
	const id = request.parameter.id
	const database = context.archive
	console.log(id)
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (!id || ![4, 8].includes(id.length))
		result = gracely.client.invalidPathArgument("user/:id", "id", "string", "A valid identifier is required.")
	else if (gracely.Error.is(database))
		result = database
	else {
		try {
			const response = await database.users.remove(id)
			result = response
				? gracely.success.ok(`User with ID ${id} or summing successfully removed`)
				: gracely.client.notFound(`Could not remove user with id ${id}`)
		} catch (error) {
			result = gracely.server.databaseFailure(error instanceof Error ? error.message : undefined)
		}
	}
	return result
}
router.add("DELETE", "/db/archive/user/:id", remove)
