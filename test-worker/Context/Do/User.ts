import * as gracely from "gracely"
import * as storage from "cloudly-storage"
import * as model from "../../model"

export class User {
	private constructor(private readonly backend: storage.DurableObject.Namespace) {}

	async create(user: model.User): Promise<model.User | gracely.Error> {
		const client = this.backend.open("test")
		return await client.post<model.User>("/user/create", user)
	}

	static open(backend?: storage.DurableObject.Namespace): User | undefined {
		return backend ? new User(backend) : undefined
	}
}
