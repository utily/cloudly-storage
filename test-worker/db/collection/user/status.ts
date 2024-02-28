import { gracely } from "gracely"
import { http } from "cloudly-http"
import { Context } from "../../../Context"
import { router } from "../../../router"

export async function status(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result | gracely.Error
	const database = context.collection
	const id: string | undefined = request.search.id
	const partition = request.search.partition
	const dump = request.search.dump == "true"
	const list: true | undefined = request.search.list == "true" ? true : undefined
	const lastArchived: true | undefined = request.search.lastArchived == "true" ? true : undefined
	const index: ["id", "changed"] | undefined = request.search.index
		? (request.search.index.split(",").filter(s => s == "id" || s == "changed") as ["id", "changed"])
		: undefined
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (!id || id.length != 4)
		result = gracely.client.invalidPathArgument("user/:id", "id", "string", "A valid identifier is required.")
	else if (gracely.Error.is(database))
		result = database
	else {
		const partitioned = partition ? database.partition(partition) : database
		const response = await partitioned.users.status({ id, list, lastArchived, index, dump })
		result =
			gracely.success.ok(response) ??
			gracely.client.invalidPathArgument("user/:id", "id", "string", "Unable to find user with that identifier.")
	}
	return result
}
router.add("GET", "/db/collection/user/status", status)
