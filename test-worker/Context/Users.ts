import * as isoly from "isoly"
import * as storage from "cloudly-storage"
import * as model from "../model"

export class Users {
	private constructor(private readonly store: storage.KeyValueStore<model.User>) {}

	async initialize(): Promise<void> {
		await this.store.set("aaa", { level: 1, id: "aaa", groups: [], name: "aaa", created: isoly.DateTime.now() })
		await this.store.set("aab", { level: 1, id: "aab", groups: [], name: "aab", created: isoly.DateTime.now() })
		await this.store.set("aac", { level: 1, id: "aac", groups: [], name: "aac", created: isoly.DateTime.now() })
		await this.store.set("aad", { level: 1, id: "aad", groups: [], name: "aad", created: isoly.DateTime.now() })
		await this.store.set("aba", { level: 1, id: "aba", groups: [], name: "aba", created: isoly.DateTime.now() })
		await this.store.set("abb", { level: 1, id: "abb", groups: [], name: "abb", created: isoly.DateTime.now() })
		await this.store.set("abc", { level: 1, id: "abc", groups: [], name: "abc", created: isoly.DateTime.now() })
		await this.store.set("abd", { level: 1, id: "abd", groups: [], name: "abd", created: isoly.DateTime.now() })
		await this.store.set("abe", { level: 1, id: "abe", groups: [], name: "abe", created: isoly.DateTime.now() })
		await this.store.set("aca", { level: 1, id: "aca", groups: [], name: "aca", created: isoly.DateTime.now() })
		await this.store.set("acb", { level: 1, id: "acb", groups: [], name: "acb", created: isoly.DateTime.now() })
		await this.store.set("acc", { level: 1, id: "acc", groups: [], name: "acc", created: isoly.DateTime.now() })
		await this.store.set("acd", { level: 1, id: "acd", groups: [], name: "acd", created: isoly.DateTime.now() })
		await this.store.set("ace", { level: 1, id: "ace", groups: [], name: "ace", created: isoly.DateTime.now() })
		await this.store.set("acf", { level: 1, id: "acf", groups: [], name: "acf", created: isoly.DateTime.now() })
		await this.store.set("acg", { level: 1, id: "acg", groups: [], name: "acg", created: isoly.DateTime.now() })
		await this.store.set("ach", { level: 1, id: "ach", groups: [], name: "ach", created: isoly.DateTime.now() })
	}
	async list(
		options?: storage.KeyValueStore.ListOptions
	): Promise<{ key: string; value?: model.User }[] & { cursor?: string }> {
		const data = await this.store.list({ ...options, values: true })
		const result = data.map(item => ({
			key: item.key,
			value: item.value,
		}))
		return result
	}

	static open(store: storage.KeyValueStore<model.User>): Users {
		return new Users(store)
	}
}
