import { http } from "cloudly-http"
export interface ListOptions {
	prefix?: string
	limit?: number
	cursor?: string
	range?: [string | undefined, string | undefined]
	values?: boolean
}
export namespace ListOptions {
	export const fallback = { prefix: "", limit: 1000, cursor: undefined, values: true }
	export function get(
		options: ListOptions | string | undefined
	): ListOptions & Pick<Required<ListOptions>, "prefix" | "values"> {
		return { ...fallback, ...(typeof options == "string" ? { prefix: options } : options) }
	}
	export function request(request: http.Request): ListOptions {
		return {
			prefix: request.search.prefix,
			limit: (request.search.limit && Number.parseInt(request.search.limit)) || undefined,
			cursor: request.search.cursor,
			range: [request.search.start, request.search.end],
		}
	}
}
