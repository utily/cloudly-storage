import * as storage from "../index"

interface User {
	value: number
}

describe("Database", () => {
	it("create", async () => {
		const configuration: storage.Database.Configuration = {
			silos: { users: { type: "archive", idLength: 4, retainChanged: true } },
		}
		const database = storage.Database.create<{ archive: { users: User } }>(configuration)
		const db = database?.partition("axb001")
		const user = { id: "abcd", created: "2022-07-30T00:17:55.730Z", changed: "2022-07-30T00:22:45.450Z", value: 42 }
		expect(await db?.users.store(user)).toEqual(user)
		expect(await db?.users.load("abcd")).toEqual(user)
		// expect(await db?.users.load()).toEqual([user])
	})
})
