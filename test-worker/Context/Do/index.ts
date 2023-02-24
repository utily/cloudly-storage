import { Environment } from "../../Environment"
import { Context } from "./Context"
export { Users as UserClient } from "./UserClient"

import "./user"

export class Do {
	private constructor(private readonly state: DurableObjectState, private readonly environment: Environment) {}
	async fetch(request: Request): Promise<Response> {
		return Context.handle(request, this.environment, this.state)
	}
	async alarm(): Promise<void> {
		const context = new Context(this.environment, this.state)
		await context.alarm.handle()
	}
}
