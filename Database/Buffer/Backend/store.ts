import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "./Context"
import { router } from "./router"

export async function store(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const document = await request.body
	const key = request.parameter.key ? request.parameter.key.replaceAll("$", "/") : undefined
	const state = context.state
	if (!document)
		result = gracely.client.invalidContent("Item", "Body is not a valid item.")
	else if (!key)
		result = gracely.client.invalidPathArgument("/buffer/:key", "key", "string", "The buffer requires a key.")
	else if (gracely.Error.is(state))
		result = state
	else {
		try {
			const store = await state.storage.put(key, document)
			const getId = await state.storage.get<{ key: string; changed: string }>(document.id)
			getId && getId.changed && (await state.storage.delete(getId.changed))
			const changed = await state.storage.put(`changed/${document.changed}/${document.id}`, key)
			const id = await state.storage.put("id/" + document.id, {
				key,
				changed: `changed/${document.changed}/${document.id}`,
			})
			await Promise.all([store, getId, changed, id])
			result = gracely.success.created(document)
		} catch (error) {
			result = gracely.server.databaseFailure(error instanceof Error ? error.message : undefined)
		}
	}
	return result
}
router.add("POST", "/buffer/:key", store)
