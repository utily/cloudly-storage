import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import * as model from "../../model"
import { router } from "../../router"

export async function list(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.Item[] | gracely.Error
	const authorization = request.header.authorization
	const durableObject = context.do
	if (!authorization)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(durableObject))
		result = durableObject
	else {
		result = await durableObject.open("test").get("/do/item")
	}
	return result
}
router.add("GET", "/do/item", list)
