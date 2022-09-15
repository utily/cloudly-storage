export type Configuration = {
	archiveTime?: number
	documentType?: string
	idLength?: number
	partitions?: string[]
	snooze?: number
}

export namespace Configuration {
	export function from(request: Request, configuration?: Configuration): Configuration {
		return Object.entries(headers).reduce(
			(r: Configuration, [key, from]) => ({ ...r, [key]: from(request, configuration) }),
			{}
		)
	}
	const headers = {
		archiveTime: (request: Request, configuration?: Configuration): number | undefined => {
			const archiveTime = +(request.headers.get("seconds-in-buffer") ?? NaN)
			return !Number.isNaN(archiveTime) ? archiveTime : configuration?.archiveTime
		},
		documentType: (request: Request, configuration?: Configuration): string | undefined => {
			return request.headers.get("document-type") ?? configuration?.documentType
		},
		idLength: (request: Request, configuration?: Configuration): number | undefined => {
			const archiveTime = +(request.headers.get("length") ?? NaN)
			return !Number.isNaN(archiveTime) ? archiveTime : configuration?.idLength
		},
		partitions: (request: Request, configuration?: Configuration): string[] | undefined => {
			return request.headers.get("partitions")?.split("/").slice(0, -1) ?? configuration?.partitions
		},
		snooze: (request: Request, configuration?: Configuration): number | undefined => {
			const archiveTime = +(request.headers.get("seconds-between-archives") ?? NaN)
			return !Number.isNaN(archiveTime) ? archiveTime : configuration?.snooze
		},
	}
}
