export interface ListOptions {
	prefix?: string
	limit?: number
	cursor?: string
	values?: boolean
}
export namespace ListOptions {
	export const fallback = { prefix: "", limit: 0, cursor: undefined, values: true }
	export function get(
		options: ListOptions | string | undefined
	): ListOptions & Pick<Required<ListOptions>, "prefix" | "limit" | "values"> {
		return { ...fallback, ...(typeof options == "string" ? { prefix: options } : options) }
	}
}
