import { gracely } from "gracely"
import { http } from "cloudly-http"
import { Context } from "../../../Context"
import { router } from "../../../router"

export async function remove(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result | gracely.Error
	const id = request.parameter.id ?? (await request.body)
	const db = context.collection
	const partition = request.search.partition
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(db))
		result = db
	else if ((Array.isArray(id) ? id : [id]).some(e => !e || typeof e != "string" || e.length != 4))
		result = gracely.client.invalidPathArgument("user/:id", "id", "string", "A valid identifier is required.")
	else {
		const partitioned = partition ? db.partition(partition) : db
		result = gracely.success.ok(await partitioned.users.remove(id))
	}
	return result
}
router.add("DELETE", "/db/collection/user/:id", remove)
router.add("POST", "/db/collection/user/delete", remove)
