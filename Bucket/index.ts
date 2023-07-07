import * as platform from "@cloudflare/workers-types";

export abstract class Bucket<V extends unknown, M extends Record<string, string>> {
	protected constructor(protected readonly backend: platform.R2Bucket) {
	}
	abstract store(key: string, value: V): Promise<platform.R2Object | undefined> 

	abstract get(key: string): Promise<{ value: V; meta?: M } | undefined>

	abstract remove(): Promise<V>

	abstract list(): Promise<V[]> 
}
