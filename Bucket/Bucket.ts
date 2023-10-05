import * as platform from "@cloudflare/workers-types"

export abstract class Bucket<
	V extends platform.Blob | ArrayBuffer | File,
	M extends Record<string, string> | undefined = undefined
> {
	protected constructor(protected readonly backend: platform.R2Bucket) {}
	abstract store(key: string, value: V, meta: M): Promise<Bucket.Result<V, M> | undefined>
	abstract get(key: string, options?: Bucket.GetOptions): Promise<Bucket.Result<V, M> | undefined>
	abstract remove(key: string | string[]): Promise<void>
	abstract list(options?: Bucket.ListOptions): Promise<(Partial<Bucket.Result<V, M>> & { key: string })[]>
}
export namespace Bucket {
	export type StoreOptions = Omit<platform.R2PutOptions, "customMetadata">
	export type GetOptions = platform.R2GetOptions
	export type ListOptions = platform.R2ListOptions & { values?: boolean }
	export interface Result<
		V extends platform.Blob | ArrayBuffer | File,
		M extends Record<string, string> | undefined = undefined
	> {
		value: V
		meta: M
	}
}
