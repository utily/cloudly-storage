import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "./Context"
import { router } from "./router"

export async function load(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const state = context.state
	const body = await request.body
	const ids: string[] | string | undefined = body && request.parameter.id ? undefined : request.parameter.id ?? body
	if (ids && typeof ids != "string" && ids.some(e => typeof e != "string"))
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(state))
		result = state
	else {
		try {
			result = gracely.success.ok(
				Array.isArray(ids)
					? await state.storage.get(ids)
					: typeof ids == "string"
					? await state.storage.get(ids)
					: Object.fromEntries(await state.storage.list())
			)
		} catch (error) {
			result = gracely.server.databaseFailure(error instanceof Error ? error.message : undefined)
		}
	}
	return result
}
router.add("GET", "/doc/:id", load)
router.add("GET", "/doc", load)
