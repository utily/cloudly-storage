import * as storage from "../index"

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
			storage.DurableObject.Namespace.open(),
			storage.KeyValueStore.Json.create()
		)
		const db = database.partition("axb001")
		expect(await db.items.put({ id: "abcd", value: 42 })).toEqual({ id: "abcd", value: 42 })
	})
})
