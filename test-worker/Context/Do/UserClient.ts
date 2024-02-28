import { gracely } from "gracely"
import * as storage from "cloudly-storage"
import * as model from "../../model"

export class Users {
	private constructor(private readonly backend: storage.DurableObject.Namespace<gracely.Error>) {}
	async create(user: model.User): Promise<model.User | gracely.Error> {
		const client = this.backend.open("test")
		return await client.post<model.User>("/user", user)
	}

	async list(): Promise<model.User[] | gracely.Error> {
		const client = this.backend.open("test")
		return await client.get<model.User[]>("/user")
	}

	async load(id: string): Promise<model.User | gracely.Error> {
		const client = this.backend.open("test")
		return await client.get<model.User>("/user/" + id)
	}

	async addGroup(id: string, group: string[]): Promise<model.User | gracely.Error> {
		const client = this.backend.open("test")
		return await client.patch<model.User>("/user/" + id + "/groups", group)
	}

	async modifyLevel(id: string, value: number): Promise<model.User | gracely.Error> {
		const client = this.backend.open("test")
		return await client.patch<model.User>("/user/" + id + "/level", value)
	}

	async alarmSet(): Promise<string | gracely.Error> {
		const client = this.backend.open("test")
		return client.post<string>("/alarm", {})
	}
	async alarmGet(): Promise<string | gracely.Error> {
		const client = this.backend.open("test")
		return client.get<string>("/alarm")
	}

	static open(backend?: storage.DurableObject.Namespace): Users | undefined {
		return backend ? new Users(backend) : undefined
	}
}
