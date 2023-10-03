import { storage } from "cloudly-storage"

export class Reports {
	private constructor(private readonly bucket: storage.Bucket<Blob, Record<string, string>>){}

	async store(report: Blob): Promise<R2Object> {
		await this.bucket.store("", report)
	}


}
