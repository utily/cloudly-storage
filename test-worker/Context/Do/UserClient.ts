import * as gracely from "gracely"
import * as storage from "cloudly-storage"
import * as model from "../../model"

export class UserClient {
	private constructor(private readonly backend: storage.DurableObject.Namespace) {}

	async create(user: model.User): Promise<model.User | gracely.Error> {
		const client = this.backend.open("test")
		return await client.post<model.User>("/user", user)
	}

	async loadAll(): Promise<model.User[] | gracely.Error> {
		const client = this.backend.open("test")
		return await client.get<model.User[]>("/user")
	}

	static open(backend?: storage.DurableObject.Namespace): UserClient | undefined {
		return backend ? new UserClient(backend) : undefined
	}
}
