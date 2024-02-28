import * as platform from "@cloudflare/workers-types"
import { http } from "cloudly-http"
import { Error } from "../Error"

export class Client<E = Error> {
	onError?: (request: http.Request, response: http.Response) => Promise<boolean>
	toError?: (request: http.Request, response: http.Response) => Promise<E>
	get id(): string {
		return this.stub.id.toString()
	}
	/**
	 * This domain is only for logging purpose.
	 * The domain is ignored, but requests are written in the log.
	 */
	private fakeDomain: string
	constructor(private readonly stub: platform.DurableObjectStub) {
		this.fakeDomain = this.stub.name?.replace(/[^\w-]/g, "") || `do-${this.id}`
	}

	private async fetch<R>(path: string, method: http.Method, body?: any, header?: http.Request.Header): Promise<R | E> {
		const request = http.Request.create({
			url: `https://${this.fakeDomain}${path}`,
			method: method,
			header: { ...(body ? { contentType: "application/json" } : {}), ...(header ? header : {}) },
			body,
		})
		const response = http.Response.from(
			(await this.stub.fetch(
				request.url.toString(),
				(await http.Request.to(request)) as unknown as platform.RequestInit<platform.RequestInitCfProperties>
			)) as unknown as Response
		)
		return (
			(response.status >= 300 &&
				((await this.onError?.(request, response))
					? await this.fetch<R>(path, method, body, header)
					: await this.toError?.(request, response))) ||
			((await response.body) as R | E)
		)
	}
	async get<R>(path: string, header?: http.Request.Header): Promise<R | E> {
		return await this.fetch<R>(path, "GET", undefined, header)
	}
	async post<R>(path: string, request: any, header?: http.Request.Header): Promise<R | E> {
		return await this.fetch<R>(path, "POST", request, header)
	}
	async delete<R>(path: string, header?: http.Request.Header): Promise<R | E> {
		return await this.fetch<R>(path, "DELETE", undefined, header)
	}
	async patch<R>(path: string, request: any, header?: http.Request.Header): Promise<R | E> {
		return await this.fetch<R>(path, "PATCH", request, header)
	}
	async put<R>(path: string, request: any, header?: http.Request.Header): Promise<R | E> {
		return await this.fetch<R>(path, "PUT", request, header)
	}
	async socket(path: string, header?: http.Request.Header): Promise<platform.WebSocket | undefined> {
		return (
			(
				await this.stub.fetch(`https://${this.fakeDomain}${path}`, {
					headers: { ...(header && http.Request.Header.to(header)), upgrade: "websocket" },
				})
			).webSocket ?? undefined
		)
	}
	connect(address: platform.SocketAddress | string, options?: platform.SocketOptions): platform.Socket {
		return this.stub.connect(address, options)
	}
}
