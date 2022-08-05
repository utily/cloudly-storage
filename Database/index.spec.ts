import * as storage from "../index"

interface Item {
	value: number
}
type Layout = { archive: { items: Item } }

describe("Database", () => {
	it("create", async () => {
		const configuration: storage.Database.Configuration = {
			silos: { items: { type: "archive", idLength: 4, retainChanged: true } },
		}
		const database: storage.Database<Layout> | undefined = storage.Database.create<Layout>(configuration)
		const db = database?.partition("axb001")
		const user = { id: "abcd", created: "2022-07-30T00:17:55.730Z", changed: "2022-07-30T00:22:45.450Z", value: 42 }
		expect(await db?.items.store(user)).toEqual(user)
		expect(await db?.items.load("abcd")).toEqual(user)
		// expect(await db?.users.load()).toEqual([user])
	})
})
