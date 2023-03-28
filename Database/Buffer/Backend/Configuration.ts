import * as isoly from "isoly"

export type Configuration = {
	retention?: number
	documentType?: string
	partitions?: string
	snooze?: number
	removeAfter?: number
	timeToLive?: isoly.TimeSpan
	index?: string[]
}

export namespace Configuration {
	export type Complete = Required<Omit<Configuration, "index" | "timeToLive">> &
		Pick<Configuration, "index" | "timeToLive">
	export const standard: Complete = {
		retention: isoly.TimeSpan.toSeconds({ minutes: 5 }),
		documentType: "unknown",
		partitions: "unkown/",
		snooze: isoly.TimeSpan.toMilliseconds({ seconds: 30 }),
		removeAfter: isoly.TimeSpan.toSeconds({ minutes: 5 }),
	}
	export function from(request: Request, configuration?: Configuration): Configuration {
		return Object.entries(headers).reduce(
			(r: Configuration, [key, configure]) => ({ ...r, [key]: configure(request, configuration) }),
			{}
		)
	}
	const headers = {
		retention: (request: Request, configuration?: Configuration): number | undefined => {
			const retention = JSON.parse(request.headers.get("reconcile-after") ?? "{}")
			return isoly.TimeSpan.is(retention) ? isoly.TimeSpan.toSeconds(retention) : configuration?.retention
		},
		documentType: (request: Request, configuration?: Configuration): string | undefined => {
			return request.headers.get("document-type") ?? configuration?.documentType
		},
		partitions: (request: Request, configuration?: Configuration): string | undefined => {
			return request.headers.get("partitions") ?? configuration?.partitions
		},
		snooze: (request: Request, configuration?: Configuration): number | undefined => {
			const snooze = JSON.parse(request.headers.get("reconciliation-interval") ?? "{}")
			return isoly.TimeSpan.is(snooze) ? isoly.TimeSpan.toMilliseconds(snooze) : configuration?.snooze
		},
		removeAfter: (request: Request, configuration?: Configuration): number | undefined => {
			const removeAfter = JSON.parse(request.headers.get("superimpose-for") ?? "{}")
			return isoly.TimeSpan.is(removeAfter) ? isoly.TimeSpan.toSeconds(removeAfter) : configuration?.removeAfter
		},
		timeToLive: (request: Request, configuration?: Configuration): isoly.TimeSpan | undefined => {
			const timeToLive = JSON.parse(request.headers.get("retention") ?? "{}")
			return isoly.TimeSpan.is(timeToLive) ? timeToLive : configuration?.timeToLive
		},
		index: (request: Request, configuration?: Configuration): string[] | undefined => {
			const index = JSON.parse(request.headers.get("index") ?? "{}")
			return typeof index == "string" ? [index] : Array.isArray(index) ? index : configuration?.index
		},
	}
}
