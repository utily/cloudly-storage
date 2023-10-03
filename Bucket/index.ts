import { Blob as BucketBlob } from "./Blob"

export namespace Bucket {
	export type Blob = BucketBlob
	export const Blob = BucketBlob
	export namespace Blob {
		export type Result<M extends Record<string, string> | undefined> = BucketBlob.Result<M>
	}
	export type Result<M extends Record<string, string> | undefined> = BucketBlob.Result<M>
}
