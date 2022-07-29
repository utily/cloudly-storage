import { Environment } from "../../Environment"
import { Context } from "./Context"

import "./create"
import "./list"
export class Do {
	private constructor(private readonly state: DurableObjectState, private readonly environment: Environment) {}

	async fetch(request: Request, environment: Environment): Promise<Response> {
		return Context.handle(request, { ...environment, state: this.state })
	}
}
