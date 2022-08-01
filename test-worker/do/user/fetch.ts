import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import * as model from "../../model"
import { router } from "../../router"

export async function fetch(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	// let result: model.User | string | gracely.Error
	// const durbaleObject = context.user
	// const id = request.parameter.id
	// if (!request.header.authorization)
	// 	result = gracely.client.unauthorized()
	// else if (!id || id.length != 1 || id < "a" || id > "f")
	// 	result = gracely.client.invalidPathArgument("user/:id", "id", "string", "A valid identifier is required.")
	// else if (gracely.Error.is(durbaleObject))
	// 	result = durbaleObject
	// else {
	// 	const client = durbaleObject.open(id)
	// 	console.log("client: ", client)
	// 	const response = await client.get<string>(id)
	// 	result =
	// 		response ??
	// 		gracely.client.invalidPathArgument("user/:id", "id", "string", "Unable to find user with that identifier.")
	// }
	return gracely.client.invalidPathArgument("user/:id", "id", "string", "Unable to find user with that identifier.")
}
router.add("GET", "/do/user/:id", fetch)
