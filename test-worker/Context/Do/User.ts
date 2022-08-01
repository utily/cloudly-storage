import * as storage from "cloudly-storage"

export class User {
	private constructor(private readonly backend: storage.DurableObject.Namespace) {}

	static open(backend?: storage.DurableObject.Namespace): User | undefined {
		return backend ? new User(backend) : undefined
	}
}
