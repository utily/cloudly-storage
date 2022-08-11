import * as gracely from "gracely"
import * as isoly from "isoly"
import * as http from "cloudly-http"
import { Context } from "../../../Context"
import * as model from "../../../model"
import { router } from "../../../router"

export async function list(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.User[] | any | gracely.Error
	const authorization = request.header.authorization
	const start = request.search.start
	const end = request.search.end
	const limit = request.search.limit ? +request.search.limit : undefined
	const database = context.archive
	if (!authorization)
		result = gracely.client.unauthorized()
	else if (start && !isoly.Date.is(start))
		result = gracely.client.invalidQueryArgument(
			"start",
			"isoly.Date | undefined",
			"start needs to be isoly.Date if defined."
		)
	else if (end && !isoly.Date.is(end))
		result = gracely.client.invalidQueryArgument(
			"end",
			"isoly.Date | undefined",
			"end needs to be an isoly.Date if defined."
		)
	else if (limit && !Number.isNaN(+limit))
		result = gracely.client.invalidQueryArgument("limit", "number", "limit needs to be a number if defined.")
	else if (gracely.Error.is(database))
		result = database
	else {
		const selection = start && end ? { limit, created: { start, end } } : undefined
		console.log("yolo")
		result = await database.users.load(selection)
	}
	return result
}
router.add("GET", "/db/archive/user", list)
