import * as isoly from "isoly"

export type Configuration = {
	retention?: number
	documentType?: string
	partitions?: string
	snooze?: number
	removeAfter?: number
	timeToLive?: isoly.TimeSpan
}

export namespace Configuration {
	export type Complete = Required<Omit<Configuration, "timeToLive">> & Pick<Configuration, "timeToLive">
	export const standard: Complete = {
		retention: isoly.TimeSpan.toMilliseconds({ minutes: 5 }),
		documentType: "unknown",
		partitions: "unkown/",
		snooze: isoly.TimeSpan.toSeconds({ seconds: 30 }),
		removeAfter: isoly.TimeSpan.toSeconds({ minutes: 5 }),
	}
	export function from(request: Request, configuration?: Configuration): Configuration {
		return Object.entries(headers).reduce(
			(r: Configuration, [key, from]) => ({ ...r, [key]: from(request, configuration) }),
			{}
		)
	}
	const headers = {
		retention: (request: Request, configuration?: Configuration): number | undefined => {
			const retention = JSON.parse(request.headers.get("reconcile-after") ?? "{}")
			return retention && isoly.TimeSpan.is(retention)
				? isoly.TimeSpan.toMilliseconds(retention)
				: configuration?.retention
		},
		documentType: (request: Request, configuration?: Configuration): string | undefined => {
			return request.headers.get("document-type") ?? configuration?.documentType
		},
		partitions: (request: Request, configuration?: Configuration): string | undefined => {
			return request.headers.get("partitions") ?? configuration?.partitions
		},
		snooze: (request: Request, configuration?: Configuration): number | undefined => {
			const snooze = JSON.parse(request.headers.get("reconciliation-interval") ?? "{}")
			return snooze && isoly.TimeSpan.is(snooze) ? isoly.TimeSpan.toMilliseconds(snooze) : configuration?.snooze
		},
		removeAfter: (request: Request, configuration?: Configuration): number | undefined => {
			const removeAfter = JSON.parse(request.headers.get("superimpose-for") ?? "{}")
			return removeAfter && isoly.TimeSpan.is(removeAfter)
				? isoly.TimeSpan.toSeconds(removeAfter)
				: configuration?.removeAfter
		},
		timeToLive: (request: Request, configuration?: Configuration): isoly.TimeSpan | undefined => {
			const timeToLive = JSON.parse(request.headers.get("retention") ?? "{}")
			return timeToLive && isoly.TimeSpan.is(timeToLive) ? timeToLive : configuration?.timeToLive
		},
	}
}
