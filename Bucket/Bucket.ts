import * as platform from "@cloudflare/workers-types"

export abstract class Bucket<
	V extends platform.Blob | ArrayBuffer | File,
	M extends Record<string, string> | undefined
> {
	protected constructor(protected readonly backend: platform.R2Bucket) {}
	abstract store(key: string, value: V, meta: M): Promise<Bucket.Result<V, M> | undefined>

	abstract get(key: string): Promise<{ value: V; meta?: M } | undefined>

	abstract remove(): Promise<V>

	abstract list(): Promise<V[]>
}
export namespace Bucket {
	export interface Result<
		V extends platform.Blob | ArrayBuffer | File,
		M extends Record<string, string> | undefined | undefined
	> {
		value: V
		meta: M
	}
}
