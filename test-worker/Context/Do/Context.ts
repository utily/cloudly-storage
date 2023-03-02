import * as gracely from "gracely"
import * as isoly from "isoly"
import * as http from "cloudly-http"
import * as storage from "cloudly-storage"
import { Environment } from "../../Environment"
import { router } from "./router"

export class Context {
	#alarm: storage.DurableObject.Alarm
	get alarm(): storage.DurableObject.Alarm {
		return this.#alarm
	}

	constructor(public readonly environment: Environment, readonly state: DurableObjectState) {
		this.#alarm = new storage.DurableObject.Alarm(this.state.storage)
		this.alarm.register("printAfter1", this.alarmTester1)
		this.alarm.register("printAfter2", this.alarmTester2)
		this.alarm.register("printAfter3", this.alarmTester3)
		this.alarm.register("printAfter4", this.alarmTester4)
		this.alarm.register("printAfter5", this.alarmTester5)
		this.alarm.register("printEveryFive", this.alarmTesterRecurring5)
		this.alarm.register("printEveryTen", this.alarmTesterRecurring10)
		this.alarm.register("printEveryFifteen", this.alarmTesterRecurring15)
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
		console.log("print this after 5 minutes")
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
