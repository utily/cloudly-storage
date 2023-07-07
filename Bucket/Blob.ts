import * as platform from "@cloudflare/workers-types"
import { Bucket } from "./index"

export class Blob<M extends Record<string, string> = Record<string, string>> extends Bucket<platform.Blob, M> {
	async store(key: string, value: platform.Blob, meta?: M): Promise<platform.R2Object | undefined> {
		return await this.backend.put(key, value.stream(), { customMetadata: meta })
	}
	async get(key: string): Promise<{ value: platform.Blob; meta?: M } | undefined> {
		const object = await this.backend.get(key)
		const value = await object?.blob()
		const meta = object?.customMetadata as M | undefined
		return value && { value, meta }
	}
	async remove(): Promise<platform.Blob> {
		throw new Error("Method not implemented.")
	}
	async list(): Promise<platform.Blob[]> {
		throw new Error("Method not implemented.")
	}
	static open(bucket?: platform.R2Bucket): Blob | undefined {
		return bucket && new this(bucket)
	}
}
