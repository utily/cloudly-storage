import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../"

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: string | gracely.Error
	const body = await request.body

	if (gracely.Error.is(context.item))
		result = context.item
	else if (!body || typeof body != "string")
		return gracely.client.invalidContent("Item", "Item to add.")
	else {
		result = await context.item.add(body)
	}
	return result
}
Context.router.add("POST", "/user", create)
