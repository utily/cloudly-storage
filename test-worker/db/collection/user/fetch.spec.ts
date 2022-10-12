import { TestStorage } from "../../../Context/TestStorage"
import * as model from "../../../model"

const collection = TestStorage.collection?.users
const partitioned = collection?.partition("one")
const partitioned2 = partitioned?.partition("two")
describe.each([
	{ db: collection, partitions: "no" },
	{ db: partitioned, partitions: "one" },
	{ db: partitioned2, partitions: "two" },
])("Collection with $partitions partitions, fetch", ({ db, partitions }) => {
	beforeAll(async () => {
		await db?.store(users)
	})
	it("one", async () => {
		const fetched = await db?.load(user.id)
		expect(fetched).toMatchObject(user)
	})
	it.skip("TODO: FIX, many", async () => {
		const fetched = await db?.load(users.map(user => user.id))
		expect(fetched).toMatchObject(users)
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
