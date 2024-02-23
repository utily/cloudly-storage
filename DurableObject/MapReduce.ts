import * as platform from "@cloudflare/workers-types"
import { Error } from "../Error"
import { Namespace } from "./Namespace"

export abstract class MapReduce<T, R> implements platform.DurableObject {
	abstract criteria: number
	abstract chunks: number
	abstract name: string
	protected constructor(
		protected readonly state: platform.DurableObjectState,
		protected readonly environment: Record<string, any>
	) {}

	async fetch(request: platform.Request): Promise<platform.Response> {
		const body = await request.body
		return new platform.Response(
			JSON.stringify(
				await (!Array.isArray(body)
					? undefined // Error handling
					: this.reduce(
							await Promise.all(
								body.length > this.criteria
									? this.distribute(body) // split into 100 pieces
									: body.map(e => this.map(e))
							)
					  ))
			)
		)
	}
	distribute(data: T[]): Promise<R>[] {
		// Split into chunks number of pieces and make one subrequest for each chunk
		return [data].map(e => MapReduce.open<T, R>(this.environment[this.name])?.process(e)) as Promise<R>[]
	}
	abstract map(data: T): Promise<R>
	abstract reduce(data: R[]): Promise<R>

	static open<T, R>(
		backend: platform.DurableObjectNamespace
	): { process: (data: T[]) => Promise<R | Error> } | undefined {
		const namespace = Namespace.open(backend)
		return namespace && { process: (data: T[]) => namespace.open().post<R>("", data) }
	}
}
export abstract class Map<T, R> extends MapReduce<T, R[]> {
	async reduce(data: R[][]): Promise<R[]> {
		return data.flat(1)
	}
}
// export class Test extends MapReduce {
// 	protected constructor(
// 		protected readonly state: platform.DurableObjectState,
// 		protected readonly environment: Record<string, any>
// 	) {
// 		super(state, environment)
// 	}

// 	map(data: any[]) {
// 		this.environment
// 		return
// 	}
// 	reduce(data: any[]) {
// 		return
// 	}
// }

// const test = Test.open("environment.Test" as any)
// test.map([])
