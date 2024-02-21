import { gracely } from "gracely"
import { isoly } from "isoly"
import { http } from "cloudly-http"
import * as storage from "cloudly-storage"
import { Environment } from "../../Environment"
import { router } from "./router"

export class Context {
	alarm: storage.DurableObject.Alarm

	constructor(public readonly environment: Environment, readonly state: DurableObjectState) {
		this.alarm = new storage.DurableObject.Alarm(this.state.storage)
	}

	async alarmTester1(): Promise<void> {
		console.log("print this after 1 minute")
	}
	async alarmTester2(): Promise<void> {
		console.log("print this after 2 minutes")
	}
	async alarmTester3(): Promise<void> {
		console.log("print this after 3 minutes")
	}
	async alarmTester4(): Promise<void> {
		console.log("print this after 4 minutes")
	}
	async alarmTester5(): Promise<void> {
		await this.alarm.set("printAfter5", isoly.DateTime.nextSecond(isoly.DateTime.now(), 10 + Math.random() * 10))
		console.log("alarming!!")
	}
	async alarmTesterRecurring10(): Promise<void> {
		console.log("print this every 10 minutes", isoly.DateTime.now())
	}
	async alarmTesterRecurring5(): Promise<void> {
		console.log("print this every 5 minutes", isoly.DateTime.now())
	}
	async alarmTesterRecurring15(): Promise<void> {
		console.log("print this every 15 minutes", isoly.DateTime.now())
	}

	static async handle(request: Request, environment: Environment, state: DurableObjectState): Promise<Response> {
		let result: http.Response
		try {
			result = await router.handle(http.Request.from(request), new Context(environment, state))
		} catch (e) {
			const details = (typeof e == "object" && e && e.toString()) || undefined
			result = http.Response.create(gracely.server.unknown(details, "exception"))
		}
		return http.Response.to(result)
	}
}
