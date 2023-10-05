import { isoly } from "isoly"
import * as platform from "@cloudflare/workers-types"
import { Bucket } from "./Bucket"

export class File<
	M extends Record<string, string> | undefined = {
		created: string
		lastModified: string
		filename: string
		type: string
	}
> extends Bucket<platform.File, M> {
	async store(
		key: string,
		value: platform.File,
		meta: M,
		options?: Bucket.StoreOptions
	): Promise<Bucket.Result<platform.File, M> | undefined> {
		meta = {
			...meta,
			created: isoly.DateTime.now(),
			lastModified: value.lastModified.toString(10),
			filename: value.name,
			type: value.type,
		}
		return (await this.backend.put(key, value.stream(), { ...options, customMetadata: meta })) && { value, meta }
	}
	async remove(key: string | string[]): Promise<void> {
		this.backend.delete(key)
	}
	async list(options?: Bucket.ListOptions): Promise<(Partial<Bucket.Result<platform.File, M>> & { key: string })[]> {
		const list = (await this.backend.list(options)).objects.map(i => ({
			key: i.key,
			meta: i.customMetadata as M,
		}))
		return options?.values
			? await Promise.all(list.map(async i => ({ ...i, value: (await this.get(i.key))?.value })))
			: list
	}
	async get(key: string, options?: Bucket.GetOptions): Promise<File.Result<M> | undefined> {
		const object = (await this.backend.get(key, options)) ?? undefined
		const value =
			object &&
			new platform.File([await object.blob()], object.customMetadata?.filename ?? "file", {
				...(object?.customMetadata?.type && { type: object.customMetadata.type }),
				...(object?.customMetadata?.lastModified && { lastModified: parseInt(object.customMetadata.lastModified, 10) }),
			})
		const meta = object?.customMetadata as M
		return value && { value, meta }
	}
	async set(key: string, value: platform.File, options?: platform.R2PutOptions): Promise<platform.File | undefined> {
		return (
			await this.backend.put(key, value.stream(), {
				...options,
				customMetadata: {
					...options?.customMetadata,
					created: isoly.DateTime.now(),
					lastModified: value.lastModified.toString(10),
					filename: value.name,
					type: value.type,
				},
			}),
			value
		)
	}

	static open<
		M extends Record<string, string> | undefined = {
			created: string
			lastModified: string
			filename: string
			type: string
		}
	>(bucket?: platform.R2Bucket): File<M> | undefined {
		return bucket && new this<M>(bucket)
	}
}
export namespace File {
	export interface Result<
		M extends Record<string, string> | undefined = {
			created: string
			lastModified: string
			filename: string
			type: string
		}
	> {
		value: platform.File
		meta: M
	}
}
