import * as gracely from "gracely"
import * as isoly from "isoly"
import * as http from "cloudly-http"
import { Cursor } from "../../Cursor"
import { Document } from "../../Document"
import { Context } from "./Context"
import { router } from "./router"

export async function load(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const header = request.header
	const body = await request.body
	const storage = context.storage
	const lock: isoly.DateTime | undefined = isoly.DateTime.is(request.header.lock) ? request.header.lock : undefined

	const partitions = header.partitions && !Array.isArray(header.partitions) ? header.partitions : undefined
	const documentType = header.documentType && !Array.isArray(header.documentType) ? header.documentType : undefined
	const shardCursor: Cursor.Shard | undefined = body.cursor
	const prefixes = Cursor.Shard.prefix(shardCursor, documentType, partitions)

	const options: { prefix: string[]; cursor?: Cursor.Shard } | string[] | string | undefined = Array.isArray(body)
		? body
		: request.parameter.id ?? (prefixes ? { prefix: prefixes, cursor: shardCursor } : undefined)

	if (
		!(
			!options ||
			typeof options == "string" ||
			(Array.isArray(options) && options.every(e => typeof e == "string")) ||
			("prefix" in options && options.prefix.every(e => typeof e == "string"))
		)
	)
		result = gracely.client.invalidContent(
			"ids",
			"Ids in buffer must be of type { prefix: string[], limit?: number } | string[] | string | undefined"
		)
	else if (lock && !isoly.DateTime.is(lock)) {
		result = gracely.client.malformedHeader("lock", "Header lock must be of type isoly.Timespan | undefined.")
	} else if (!storage)
		result = gracely.server.backendFailure("Failed to open Buffer Storage.")
	else {
		try {
			result = gracely.success.ok(await storage.load<Document & Record<string, any>>(options, lock))
		} catch (error) {
			result = gracely.server.databaseFailure(error instanceof Error ? error.message : undefined)
		}
	}
	return result
}
router.add("GET", "/buffer", load)
router.add("GET", "/buffer/:id", load)
router.add("POST", "/buffer/prefix", load)
