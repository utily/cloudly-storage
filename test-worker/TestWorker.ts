import * as http from "cloudly-http"
import { Environment } from "./Environment"
import { fetch } from "./index"

export class TestWorker {
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	constructor(private readonly environment: Environment) {}

	private async fetch(
		path: string,
		method: http.Method,
		body?: any,
		header?: http.Request.Header
	): Promise<http.Response> {
		const request = await http.Request.to({
			url: `http://localhost:8787${path}`,
			method: method,
			header: {
				authorization: "Basic ",
				...(body ? { contentType: "application/json" } : {}),
				...(header ? header : {}),
			},
			body,
		})
		return http.Response.from(await fetch(new Request(request.url, request), this.environment))
	}

	async get(path: string, header?: http.Request.Header): Promise<http.Response> {
		return await this.fetch(path, "GET", undefined, header)
	}
	async post(path: string, body: any, header?: http.Request.Header): Promise<http.Response> {
		return await this.fetch(path, "POST", body, header)
	}
	async delete(path: string, header?: http.Request.Header): Promise<http.Response> {
		return await this.fetch(path, "DELETE", undefined, header)
	}
	async patch(path: string, body: any, header?: http.Request.Header): Promise<http.Response> {
		return await this.fetch(path, "PATCH", body, header)
	}
	async put(path: string, body: any, header?: http.Request.Header): Promise<http.Response> {
		return await this.fetch(path, "PUT", body, header)
	}
	static open(): TestWorker | undefined {
		return new TestWorker(getMiniflareBindings())
	}
}
