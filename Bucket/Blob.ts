import * as platform from "@cloudflare/workers-types"
import { Bucket } from "./Bucket"

export class Blob<M extends Record<string, string> | undefined = undefined> extends Bucket<platform.Blob, M> {
	async store(key: string, value: platform.Blob, meta: M): Promise<Blob.Result<M> | undefined> {
		await this.backend.put(key, value.stream(), { customMetadata: meta })
		return { value, meta }
	}
	async get(key: string): Promise<{ value: platform.Blob; meta?: M } | undefined> {
		const object = await this.backend.get(key)
		const value = await object?.blob()
		const meta = object?.customMetadata as M
		return value && { value, meta }
	}
	async remove(): Promise<platform.Blob> {
		throw new Error("Method not implemented.")
	}
	async list(): Promise<platform.Blob[]> {
		// const list = await this.backend.list(options)
		// const objects = list.objects
		// objects.map(o => o.customMetadata)
		throw new Error("Method not implemented.")
	}
	static open(bucket?: platform.R2Bucket): Blob | undefined {
		return bucket && new this(bucket)
	}
}

export namespace Blob {
	export interface Result<M extends Record<string, string> | undefined> {
		value: platform.Blob
		meta: M
	}
}
