import * as gracely from "gracely"
import * as http from "cloudly-http"
import * as storage from "cloudly-storage"
import { Context } from "../../Context"
import * as model from "../../model"
import { router } from "../../router"

export async function list(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	let response: ({ key: string; value?: model.User }[] & { cursor?: string }) | undefined = undefined
	const users = context.usersKv
	const start = request.header.start
	const end = request.header.end
	const cursor = request.header.cursor
	const limit = request.header.limit

	if (!request.header.authorization)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(users))
		result = users
	else {
		const options: storage.KeyValueStore.ListOptions = {
			cursor: typeof cursor == "string" ? cursor : undefined,
			range: [typeof start == "string" ? start : undefined, typeof end == "string" ? end : undefined],
			limit: typeof limit == "string" ? Number.parseInt(limit) : undefined,
		}
		await users.initialize()
		response = await users.list(options)
		result = gracely.success.ok(response)
	}
	return { ...result, header: { cursor: response && response.cursor } }
}
router.add("GET", "/kv/user", list)
