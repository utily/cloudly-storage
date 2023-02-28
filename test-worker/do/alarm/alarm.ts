import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function alarm(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: string | gracely.Error
	const userClient = context.users

	if (gracely.Error.is(userClient))
		result = userClient
	else
		result = await userClient.alarm()
	return result
}
router.add("GET", "/do/alarm", alarm)
