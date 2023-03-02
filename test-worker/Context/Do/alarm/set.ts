import * as isoly from "isoly"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function set(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	const alarm = context.alarm
	const now = isoly.DateTime.now()
	await alarm.recurring("printEveryFive", "minutes", 5)
	await alarm.recurring("printEveryTen", "minutes", 10)
	await alarm.recurring("printEveryFifteen", "minutes", 15)

	for (let i = 1; i < 6; i++)
		await alarm.set(`printAfter${i}`, isoly.DateTime.nextMinute(now, i))

	return "success"
}
router.add("GET", "/alarm", set)
