import * as cryptly from "cryptly"
import * as gracely from "gracely"
import * as isoly from "isoly"
import * as http from "cloudly-http"
import { Context } from "../../../Context"
import { router } from "../../../router"

export async function load(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: (gracely.Result & { header: Record<string, string | undefined> }) | gracely.Error
	const authorization = request.header.authorization
	const database = context.archive
	const locus: { locus: string } | undefined =
		typeof request.header.locus == "string" ? { locus: request.header.locus } : undefined
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
	else if (locus && !cryptly.Identifier.is(locus.locus))
		result = gracely.client.malformedHeader("locus", "If defined locus must be a cryptly.Identifier.")
	else if (gracely.Error.is(database))
		result = database
	else {
		console.log("This is the endpoint I am using")
		console.log("locus is", locus)

		const listed = await database.users.load(
			locus ? locus : start && end ? { created: { start, end }, limit } : { limit }
		)
		const response = gracely.success.ok(listed) ?? gracely.server.databaseFailure()
		result = { ...response, header: { ...response.header, locus: listed.locus } }
	}
	return result
}
router.add("GET", "/db/archive/user/loadSelection", load)
