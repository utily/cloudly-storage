import { storage } from "cloudly-storage"
import { Environment } from "../Environment"

export class Reports {
	private constructor(
		private readonly blobBucket: storage.Bucket.Blob<Record<string, string>>,
		private readonly fileBucket: storage.Bucket.File
	) {}
	async store(
		key: string,
		report: Blob,
		meta?: Record<string, string>
	): Promise<storage.Bucket.Blob.Result<Record<string, string>> | undefined> {
		return await this.blobBucket.store(key, report, meta ?? {})
	}
	async get(key: string): Promise<storage.Bucket.Blob.Result<Record<string, string>> | undefined> {
		return await this.blobBucket.get(key)
	}
	async list(): Promise<Blob[]> {
		return (await this.blobBucket.list({ values: true })).flatMap(v => (v.value ? [v.value] : []))
	}

	static open(environment: Environment): Reports | undefined {
		const blobBucket = storage.Bucket.Blob.open<Record<string, string>>(environment.bucket)
		const fileBucket = storage.Bucket.File.open(environment.bucket)
		return blobBucket && fileBucket && new Reports(blobBucket, fileBucket)
	}
}
