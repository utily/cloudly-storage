import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "./Context"
import { router } from "./router"

export async function load(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const state = context.state
	const ids: string[] | string | undefined = request.parameter.id ?? (await request.body)
	if (ids && typeof ids != "string" && ids.some(e => typeof e != "string"))
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(state))
		result = state
	else {
		try {
			let response
			switch (typeof ids) {
				case "string":
					const key = await state.storage
						.get<{ key: string; changed: string }>(ids)
						.then(r => (r && r.key ? r.key : undefined))
					response = key ? await state.storage.get(key) : undefined
					break
				default:
					break
			}
			result = gracely.success.ok(response)
		} catch (error) {
			result = gracely.server.databaseFailure(error instanceof Error ? error.message : undefined)
		}
	}
	return result
}
router.add("GET", "/buffer", load)
router.add("GET", "/buffer/:id", load)
