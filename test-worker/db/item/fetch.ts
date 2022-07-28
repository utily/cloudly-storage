import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import * as model from "../../model"
import { router } from "../../router"

export async function fetch(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.Item | gracely.Error
	const database = context.database
	const id = request.parameter.id
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (!id || id.length != 1 || id < "a" || id > "f")
		result = gracely.client.invalidPathArgument("item/:id", "id", "string", "A valid identifier is required.")
	else if (gracely.Error.is(database))
		result = database
	else {
		const response = await database.items.load(id)
		result =
			response ??
			gracely.client.invalidPathArgument("item/:id", "id", "string", "Unable to find item with that identifier.")
	}
	return result
}
router.add("GET", "/db/item/:id", fetch)
