//import * as gracely from "gracely"
import * as storage from "cloudly-storage"
import * as model from "../../model"

export class UserClient {
	private constructor(private readonly backend: storage.DurableObject.Namespace) {}

	async create(user: model.User): Promise<model.User | storage.Error> {
		const client = this.backend.open("test")
		return await client.post<model.User>("/user", user)
	}

	async loadAll(): Promise<model.User[] | storage.Error> {
		const client = this.backend.open("test")
		return await client.get<model.User[]>("/user")
	}

	async load(id: string): Promise<model.User | storage.Error> {
		const client = this.backend.open("test")
		return await client.get<model.User>("/user/" + id)
	}

	async addGroup(id: string, group: string[]): Promise<model.User | storage.Error> {
		const client = this.backend.open("test")
		return await client.patch<model.User>("/user/" + id + "/groups", group)
	}

	async modifyLevel(id: string, value: number): Promise<model.User | storage.Error> {
		const client = this.backend.open("test")
		return await client.patch<model.User>("/user/" + id + "/level", value)
	}

	static open(backend?: storage.DurableObject.Namespace): UserClient | undefined {
		return backend ? new UserClient(backend) : undefined
	}
}
