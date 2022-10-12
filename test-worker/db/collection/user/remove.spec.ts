import { TestStorage } from "../../../Context/TestStorage"
import * as model from "../../../model"

const collection = TestStorage.collection?.users
const partitioned = collection?.partition("one")
const partitioned2 = partitioned?.partition("two")
describe.each([
	{ db: collection, partitions: "no" },
	{ db: partitioned, partitions: "one" },
	{ db: partitioned2, partitions: "two" },
])("Collection remove", ({ db, partitions }) => {
	describe(`using ${partitions} partitions`, () => {
		beforeAll(async () => {
			await db?.store(users)
		})
		it("one user", async () => {
			const loaded = await db?.load(user.id)
			expect(model.User.is(loaded)).toBeTruthy()
			await db?.remove(user.id)
			const removed = await db?.load(user.id)
			expect(removed).toBeUndefined()
		})
		it.skip("TODO: FIX; many users", async () => {
			const loaded = await db?.load()
			expect(loaded?.every(model.User.is)).toBeTruthy()
			console.log("removed: ", await db?.remove(users.map(user => user.id)))
			expect(await db?.load()).toMatchObject([])
		})
	})
})

const user: model.User = {
	level: 0,
	id: "AAAA",
	groups: ["group2"],
	name: "Bia",
	created: "2022-08-15T01:50:03.649Z",
}

const users: model.User[] = [
	user,
	{ ...user, id: "AAAB" },
	{ ...user, id: "AAAC" },
	{ ...user, id: "AAAD" },
	{ ...user, id: "AAAE" },
	{ ...user, id: "AAAF" },
	{ ...user, id: "AAAG" },
]
