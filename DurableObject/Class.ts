import * as platform from "@cloudflare/workers-types"
import { http } from "cloudly-http"
import { Router } from "cloudly-router"

export abstract class Class implements platform.DurableObject {
	abstract router: Router<Class>
	constructor(state: platform.DurableObjectState, environment: Record<string, any>) {
		return
	}

	async fetch(request: platform.Request<unknown, platform.CfProperties<unknown>>): Promise<platform.Response> {
		return new platform.Response(
			undefined,
			await http.Response.to(await this.router.handle(http.Request.from(request), this))
		)
	}
	alarm?(): void | Promise<void> {
		throw new Error("Method not implemented.")
	}
}
