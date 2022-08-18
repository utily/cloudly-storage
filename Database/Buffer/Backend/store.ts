import * as gracely from "gracely"
import * as http from "cloudly-http"
import { DurableObjectState } from "../../../platform"
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
			await put(key, document, state)
			result = gracely.success.created(document)
		} catch (error) {
			result = gracely.server.databaseFailure(error instanceof Error ? error.message : undefined)
		}
	}
	return result
}
router.add("POST", "/buffer/:key", store)

async function put<T extends { id: string } & Record<string, any>>(
	key: string,
	document: T,
	state: DurableObjectState
): Promise<void> {
	console.log("put")
	const idIndexKey = "id/" + document.id
	await removeChanged(key, state, idIndexKey)
	const changedKey = `changed/${truncateDateTime(document.changed)}`
	const changedIndex = await state.storage.get<string>(changedKey)
	const everything = {
		[key]: document,
		[changedKey]: (changedIndex ? changedIndex + "\n" : "") + key,
		[idIndexKey]: key,
	}
	return await state.storage.put(everything)
}

async function removeChanged(key: string, state: DurableObjectState, idIndexKey: string): Promise<void> {
	const oldDoc = await state.storage
		.get<string>(idIndexKey)
		.then(async r => (r ? await state.storage.get<Record<string, any>>(r) : undefined))
	const oldChangedIndex = oldDoc ? "changed/" + truncateDateTime(oldDoc.changed) : undefined
	oldChangedIndex &&
		(await state.storage
			.get<string>(oldChangedIndex)
			.then(async r => (r ? await state.storage.put(oldChangedIndex, r.replace(key + "\n", "")) : undefined)))
}

// TODO change to new isoly truncate function.
function truncateDateTime(dateTime: string): string {
	console.log("dateTime: ", dateTime)
	return dateTime.substring(0, 19)
}
