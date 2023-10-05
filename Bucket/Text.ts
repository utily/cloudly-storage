import * as platform from "@cloudflare/workers-types"
import { Bucket } from "./Bucket"

export class Text<M extends Record<string, string> | undefined = undefined> extends Bucket<string, M> {
	async store(key: string, value: string, meta: M, options?: Bucket.StoreOptions): Promise<Text.Result<M> | undefined> {
		return (await this.backend.put(key, value, { ...options, customMetadata: meta })) && { value, meta }
	}
	async get(key: string, options?: Bucket.GetOptions): Promise<Text.Result<M> | undefined> {
		const object = await this.backend.get(key, options)
		const value = await object?.text()
		const meta = object?.customMetadata as M
		return typeof value == "string" ? { value, meta } : undefined
	}
	async remove(key: string | string[]): Promise<void> {
		this.backend.delete(key)
	}
	async list(options?: Bucket.ListOptions): Promise<(Partial<Text.Result<M>> & { key: string })[]> {
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
	): Text<M> | undefined {
		return bucket && new this<M>(bucket)
	}
}
export namespace Text {
	export interface Result<M extends Record<string, string> | undefined = undefined> {
		value: string
		meta: M
	}
}
