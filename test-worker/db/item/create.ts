import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import * as model from "../../model"
import { router } from "../../router"

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const database = context.database
	const item = await request.body
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (!model.Item.is(item))
		result = gracely.client.invalidContent("Item", "Body is not a valid item.")
	else if (gracely.Error.is(database))
		result = database
	else {
		const response = await database.items.store(item)
		result = response ? gracely.success.created(response) : gracely.server.databaseFailure()
	}
	return result
}
router.add("POST", "/db/item", create)
