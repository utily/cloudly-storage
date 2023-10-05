import * as platform from "@cloudflare/workers-types"
import { Bucket } from "./Bucket"

export class Blob<M extends Record<string, string> | undefined = undefined> extends Bucket<platform.Blob, M> {
	async store(
		key: string,
		value: platform.Blob,
		meta: M,
		options?: Bucket.StoreOptions
	): Promise<Blob.Result<M> | undefined> {
		return (await this.backend.put(key, value.stream(), { ...options, customMetadata: meta })) && { value, meta }
	}
	async get(key: string, options?: Bucket.GetOptions): Promise<Blob.Result<M> | undefined> {
		const object = await this.backend.get(key, options)
		const value = await object?.blob()
		const meta = object?.customMetadata as M
		return value && { value, meta }
	}
	async remove(key: string | string[]): Promise<void> {
		this.backend.delete(key)
	}
	async list(options?: Bucket.ListOptions): Promise<(Partial<Blob.Result<M>> & { key: string })[]> {
		const list = (await this.backend.list(options)).objects.map(i => ({
			key: i.key,
			meta: i.customMetadata as M,
		}))
		return options?.values
			? await Promise.all(list.map(async i => ({ ...i, value: (await this.get(i.key))?.value })))
			: list
	}

	static open<M extends Record<string, string> | undefined = undefined>(
		bucket?: platform.R2Bucket
	): Blob<M> | undefined {
		return bucket && new this<M>(bucket)
	}
}
export namespace Blob {
	export interface Result<M extends Record<string, string> | undefined = undefined> {
		value: platform.Blob
		meta: M
	}
}
