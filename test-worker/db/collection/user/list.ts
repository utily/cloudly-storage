import * as cryptly from "cryptly"
import * as gracely from "gracely"
import * as isoly from "isoly"
import * as http from "cloudly-http"
import { Context } from "../../../Context"
import { router } from "../../../router"

export async function list(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: (gracely.Result & { header: Record<string, string | undefined> }) | gracely.Error
	const authorization = request.header.authorization
	const cursor: { cursor: string } | undefined =
		typeof request.header.cursor == "string" ? { cursor: request.header.cursor } : undefined
	const start = request.search.start
	const end = request.search.end
	const limit = request.search.limit ? +request.search.limit : undefined
	const queryType: "created" | "changed" | undefined = request.search.type as "created" | "changed" | undefined
	const onlyMeta: boolean = request.search.meta == "true"
	const index: "operation" | undefined = request.search.index == "operation" ? "operation" : undefined
	const partition = request.search.partition
	const database = context.collection
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
	else if (gracely.Error.is(database))
		result = database
	else if (cursor && !cryptly.Identifier.is(cursor.cursor))
		result = gracely.client.malformedHeader("cursor", "If defined cursor must be a cryptly.Identifier.")
	else if (queryType && !(queryType == "changed" || queryType == "created"))
		result = gracely.client.invalidQueryArgument(
			"type",
			`"created" | "changed" | "undefined"`,
			"type must be of the specified type."
		)
	else {
		const partitioned = partition ? database.partition(partition) : database
		const listed = await partitioned.users.load(
			cursor ? cursor : start && end && queryType ? { index, [queryType]: { start, end }, limit, onlyMeta } : { limit }
		)
		const response = gracely.success.ok(listed) ?? gracely.server.databaseFailure()
		result = { ...response, header: { ...response.header, cursor: "cursor" in listed ? listed.cursor : undefined } }
	}
	return result
}
router.add("GET", "/db/collection/user", list)
