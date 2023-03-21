import { Environment } from "../../Environment"
import { Context } from "./Context"
export { Users as UserClient } from "./UserClient"

import "./user"
import "./alarm"

export class Do {
	private constructor(private readonly state: DurableObjectState, private readonly environment: Environment) {}
	async fetch(request: Request): Promise<Response> {
		return Context.handle(request, this.environment, this.state)
	}
	async alarm(): Promise<void> {
		const context = new Context(this.environment, this.state)
		context.alarm.register("printAfter1", context.alarmTester1.bind(context))
		context.alarm.register("printAfter2", context.alarmTester2.bind(context))
		context.alarm.register("printAfter3", context.alarmTester3.bind(context))
		context.alarm.register("printAfter4", context.alarmTester4.bind(context))
		context.alarm.register("printAfter5", context.alarmTester5.bind(context))
		context.alarm.register("printEveryFive", context.alarmTesterRecurring5.bind(context))
		context.alarm.register("printEveryTen", context.alarmTesterRecurring10.bind(context))
		context.alarm.register("printEveryFifteen", context.alarmTesterRecurring15.bind(context))
		context.alarm.handle()
	}
}
