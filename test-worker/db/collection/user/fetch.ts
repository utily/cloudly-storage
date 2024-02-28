import { gracely } from "gracely"
import { http } from "cloudly-http"
import { Context } from "../../../Context"
import { router } from "../../../router"

export async function fetch(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result | gracely.Error
	const database = context.collection
	const id: string | undefined = request.parameter.id
	const partition = request.search.partition
	const lock: true | undefined = request.search.lock == "true" ? true : undefined
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (!id || id.length != 4)
		result = gracely.client.invalidPathArgument("user/:id", "id", "string", "A valid identifier is required.")
	else if (gracely.Error.is(database))
		result = database
	else {
		const options = lock ? { lock: { minutes: 1 } } : undefined
		const partitioned = partition ? database.partition(partition) : database
		const response = await partitioned.users.load(id, options)
		result =
			gracely.success.ok(response) ??
			gracely.client.invalidPathArgument("user/:id", "id", "string", "Unable to find user with that identifier.")
	}
	return result
}
router.add("GET", "/db/collection/user/:id", fetch)
