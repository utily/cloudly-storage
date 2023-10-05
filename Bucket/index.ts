import { Blob as BucketBlob } from "./Blob"
import { File as BucketFile } from "./File"
import { Text as BucketText } from "./Text"

export namespace Bucket {
	export type Blob<M extends Record<string, string> | undefined = undefined> = BucketBlob<M>
	export const Blob = BucketBlob
	export namespace Blob {
		export type Result<M extends Record<string, string> | undefined = undefined> = BucketBlob.Result<M>
	}
	export type File<
		M extends Record<string, string> | undefined = {
			created: string
			lastModified: string
			filename: string
			type: string
		}
	> = BucketFile<M>
	export const File = BucketFile
	export namespace File {
		export type Result<
			M extends Record<string, string> | undefined = {
				created: string
				lastModified: string
				filename: string
				type: string
			}
		> = BucketFile.Result<M>
	}
	export type Text<M extends Record<string, string> | undefined = undefined> = BucketText<M>
	export const Text = BucketText
	export namespace Text {
		export type Result<M extends Record<string, string> | undefined = undefined> = BucketText.Result<M>
	}
	export type Result<M extends Record<string, string> | undefined = undefined> =
		| BucketBlob.Result<M>
		| BucketFile.Result<M>
		| BucketText.Result<M>
}
