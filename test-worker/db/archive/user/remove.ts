import { gracely } from "gracely"
import { http } from "cloudly-http"
import { Context } from "../../../Context"
import { router } from "../../../router"

export async function remove(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result | gracely.Error
	const id = request.parameter.id ?? (await request.body)
	const db = context.archive
	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(db))
		result = db
	else if ((Array.isArray(id) ? id : [id]).some(e => !e || typeof e != "string" || e.length != 4))
		result = gracely.client.invalidPathArgument("user/:id", "id", "string", "A valid identifier is required.")
	else
		result = gracely.success.ok(await db.users.remove(id))
	return result
}
router.add("DELETE", "/db/archive/user/:id", remove)
router.add("POST", "/db/archive/user/delete", remove)
