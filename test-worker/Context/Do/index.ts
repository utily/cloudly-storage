import { Environment } from "../../Environment"
import { Context } from "./Context"
export { Users as UserClient } from "./UserClient"

import "./user"
import "./alarm"

export class Do {
	private constructor(private readonly state: DurableObjectState, private readonly environment: Environment) {}
	async fetch(request: Request): Promise<Response> {
		console.log("asdf")

		return Context.handle(request, this.environment, this.state)
	}
	async alarm(): Promise<void> {
		const context = new Context(this.environment, this.state)
		await context.alarm.register("printAfter1", context.alarmTester1.bind(context))
		await context.alarm.register("printAfter2", context.alarmTester2.bind(context))
		await context.alarm.register("printAfter3", context.alarmTester3.bind(context))
		await context.alarm.register("printAfter4", context.alarmTester4.bind(context))
		await context.alarm.register("printAfter5", context.alarmTester5.bind(context))
		await context.alarm.register("printEveryFive", context.alarmTesterRecurring5.bind(context))
		await context.alarm.register("printEveryTen", context.alarmTesterRecurring10.bind(context))
		await context.alarm.register("printEveryFifteen", context.alarmTesterRecurring15.bind(context))
		await context.alarm.handle()
		const test = await context.state.storage.list()
		console.log(test)
	}
}
