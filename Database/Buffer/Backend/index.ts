import "./create"
import "./list"
import { DurableObjectState } from "../../../platform"
import { Context } from "./Context"
import { Environment } from "./Environment"

export class Backend {
	private constructor(private readonly state: DurableObjectState) {}

	async fetch(request: Request, environment: Environment): Promise<Response> {
		return await Context.handle(request, { ...environment, state: this.state })
	}
}
