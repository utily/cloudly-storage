import * as storage from "../index"
import * as platform from "../platform"
interface Item {
	value: number
}

describe("Database", () => {
	it("create", async () => {
		const configuration: storage.Database.Configuration = {
			items: { shards: 8 },
		}
		const database = storage.Database.create<{ items: Item }>(
			configuration,
			{} as platform.DurableObjectNamespace,
			{} as platform.KVNamespace
		)
		const db = database?.partition("axb001")
		expect(await db?.items.store({ id: "abcd", value: 42 })).toEqual({ id: "abcd", value: 42 })
		expect(await db?.items.load("abcd")).toEqual({ id: "abcd", value: 42 })
	})
})
