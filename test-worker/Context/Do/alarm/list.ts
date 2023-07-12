// import * as isoly from "isoly"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function list(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	const a = await context.state.storage.get("alarms|")
	console.log(a)
	// const alarm = context.alarm
	// const now = isoly.DateTime.now()
	// await context.state.storage.put("alarms|", [{ time: isoly.DateTime.previousHour(now), action: "printEveryFifteen" }])
	// await alarm.set("printEveryFifteen", isoly.DateTime.previousHour(now, 3))
	// await alarm.recurring("printEveryFive", "minutes", 5)
	// await alarm.recurring("printEveryTen", "minutes", 10)
	// await alarm.recurring("printEveryFifteen", "minutes", 15)

	// for (let i = 1; i < 6; i++)
	// 	await alarm.set(`printAfter${i}`, isoly.DateTime.nextMinute(now, i))
	// const test = await context.state.storage.list()
	// //await context.state.storage.deleteAll()
	// console.log(test)

	return "success"
}
router.add("GET", "/alarm", list)
