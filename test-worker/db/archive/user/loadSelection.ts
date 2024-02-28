import { cryptly } from "cryptly"
import { gracely } from "gracely"
import { isoly } from "isoly"
import { http } from "cloudly-http"
import { Context } from "../../../Context"
import { router } from "../../../router"

export async function load(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: (gracely.Result & { header: Record<string, string | undefined> }) | gracely.Error
	const authorization = request.header.authorization
	const database = context.archive
	const cursor: { cursor: string } | undefined =
		typeof request.header.cursor == "string" ? { cursor: request.header.cursor } : undefined
	const start = request.search.start
	const end = request.search.end
	const limit = request.search.limit ? +request.search.limit : undefined
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
	else if (limit && Number.isNaN(limit))
		result = gracely.client.invalidQueryArgument("limit", "number", "limit needs to be a number if defined.")
	else if (cursor && !cryptly.Identifier.is(cursor.cursor))
		result = gracely.client.malformedHeader("cursor", "If defined cursor must be a cryptly.Identifier.")
	else if (gracely.Error.is(database))
		result = database
	else {
		const listed = await database.users.load(
			cursor ? cursor : start && end ? { created: { start, end }, limit } : { limit }
		)
		const response = gracely.success.ok(listed) ?? gracely.server.databaseFailure()
		result = { ...response, header: { ...response.header, cursor: listed.cursor } }
	}
	return result
}
router.add("GET", "/db/archive/user/loadSelection", load)
