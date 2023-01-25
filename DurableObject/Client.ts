import * as http from "cloudly-http"
import { Error } from "../Error"
import * as platform from "../platform"

export class Client {
	onError?: (request: http.Request, response: http.Response) => Promise<boolean>
	get id(): string {
		return this.stub.id.toString()
	}
	constructor(private readonly stub: platform.DurableObjectStub) {}

	private async fetch<R>(
		path: string,
		method: http.Method,
		body?: any,
		header?: http.Request.Header
	): Promise<R | Error> {
		const request = http.Request.create({
			url: `https://origin${path}`,
			method: method,
			header: { ...(body ? { contentType: "application/json" } : {}), ...(header ? header : {}) },
			body,
		})
		const reponse = await this.stub
			.fetch(request.url.toString(), await http.Request.to(request))
			.catch(e => Error.create("DOClient", e))
		const httpResponse = !Error.is(reponse) ? http.Response.from(reponse) : reponse
		return Error.is(httpResponse)
			? httpResponse
			: httpResponse.status >= 300 && this.onError && (await this.onError(request, httpResponse))
			? await this.fetch<R>(path, method, body, header)
			: ((await httpResponse.body) as R | Error)
	}
	async get<R>(path: string, header?: http.Request.Header): Promise<R | Error> {
		return await this.fetch<R>(path, "GET", undefined, header)
	}
	async post<R>(path: string, request: any, header?: http.Request.Header): Promise<R | Error> {
		return await this.fetch<R>(path, "POST", request, header)
	}
	async delete<R>(path: string, header?: http.Request.Header): Promise<R | Error> {
		return await this.fetch<R>(path, "DELETE", undefined, header)
	}
	async patch<R>(path: string, request: any, header?: http.Request.Header): Promise<R | Error> {
		return await this.fetch<R>(path, "PATCH", request, header)
	}
	async put<R>(path: string, request: any, header?: http.Request.Header): Promise<R | Error> {
		return await this.fetch<R>(path, "PUT", request, header)
	}
}
