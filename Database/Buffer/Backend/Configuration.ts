import * as isoly from "isoly"

export type Configuration = {
	retention?: number
	documentType?: string
	idLength?: number
	partitions?: string[]
	snooze?: number
	removeAfter?: number
}

export namespace Configuration {
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
		idLength: (request: Request, configuration?: Configuration): number | undefined => {
			const idLength = request.headers.get("id-length")
			return idLength && isoly.TimeSpan.is(idLength) ? isoly.TimeSpan.toMilliseconds(idLength) : configuration?.idLength
		},
		partitions: (request: Request, configuration?: Configuration): string[] | undefined => {
			return request.headers.get("partitions")?.split("/").slice(0, -1) ?? configuration?.partitions
		},
		snooze: (request: Request, configuration?: Configuration): number | undefined => {
			const snooze = JSON.parse(request.headers.get("reconciliation-interval") ?? "{}")
			return snooze && isoly.TimeSpan.is(snooze) ? isoly.TimeSpan.toMilliseconds(snooze) : configuration?.snooze
		},
		removeAfter: (request: Request, configuration?: Configuration): number | undefined => {
			const removeAfter = JSON.parse(request.headers.get("superimpose-for") ?? "{}")
			return removeAfter && isoly.TimeSpan.is(removeAfter)
				? isoly.TimeSpan.toMilliseconds(removeAfter)
				: configuration?.removeAfter
		},
	}
}
