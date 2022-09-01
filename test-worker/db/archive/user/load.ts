import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../../Context"
import { router } from "../../../router"

export async function load(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result | gracely.Error
	const database = context.archive
	const id: string | undefined = request.parameter.id
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (!id || id.length != 4)
		result = gracely.client.invalidPathArgument("user/:id", "id", "string", "A valid identifier is required.")
	else if (gracely.Error.is(database))
		result = database
	else {
		const response = await database.users.load(id)
		result =
			gracely.success.ok(response) ??
			gracely.client.invalidPathArgument("user/:id", "id", "string", "Unable to find user with that identifier.")
	}
	return result
}
router.add("GET", "/db/archive/user/:id", load)
