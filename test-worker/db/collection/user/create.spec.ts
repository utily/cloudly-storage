import { TestStorage } from "../../../Context/TestStorage"
import * as model from "../../../model"

const collection = TestStorage.collection?.users
const partitioned = collection?.partition("one")
const partitioned2 = partitioned?.partition("two")

describe.each([
	{ db: collection, partitions: "no" },
	{ db: partitioned, partitions: "one" },
	{ db: partitioned2, partitions: "two" },
])("Collection with $partitions partitions", ({ db, partitions }) => {
	beforeAll(async () => {
		await db?.store(users)
	})
	it("append one array", async () => {
		const groups = ["first"]
		const appended = await db?.append({ id: user.id, groups })
		expect(model.User.is(appended)).toBeTruthy()
		const loaded = await db?.load(user.id)
		expect(model.User.is(loaded)).toBeTruthy()
		expect(loaded?.groups).toEqual(groups)
		expect(loaded?.groups).toEqual(appended?.groups)
	})
	it("append one string", async () => {
		const name = "newName"
		const appended = await db?.append({ id: "AAAB", name })
		const loaded = await db?.load("AAAB")
		expect(model.User.is(loaded)).toBeTruthy()
		expect(loaded?.name).toEqual(name)
		expect(loaded?.name).toEqual(appended?.name)
	})
	it("append many arrays", async () => {
		const amendment = users.map(user => ({ id: user.id, groups: [user.name] }))
		const appended = await db?.append(amendment)
		expect(appended?.every(model.User.is)).toBeTruthy()
		const listed = await db?.load()
		expect(listed?.every(model.User.is)).toBeTruthy()
		expect(
			listed?.every(e => e?.groups.slice(-1)[0] == e?.name && e?.created == createdDate + createdTime)
		).toBeTruthy()
		expect(listed?.length).toEqual(users.length)
		const appended2 = await db?.append(amendment)
		expect(
			appended2?.every(
				e =>
					e?.groups.every(g => g == e?.name) &&
					e.groups.length == user.groups.length + 2 &&
					e?.created == createdDate + createdTime
			)
		).toBeTruthy()
	})
	it("append many numbers", async () => {
		const level = 3
		const amendment = users.map(user => ({ id: user.id, level }))
		const appended = await db?.append(amendment)
		expect(appended?.every(model.User.is)).toBeTruthy()
		const listed = await db?.load()
		expect(listed?.every(model.User.is)).toBeTruthy()
		expect(listed?.every(e => e?.level == level && e.created == createdDate + createdTime)).toBeTruthy()
		expect(listed?.length).toEqual(users.length)
	})
})

const createdDate = "2022-08-15"
const createdTime = "T01:50:03.649Z"
const user: model.User = {
	level: 2,
	id: "AAAA",
	groups: [],
	name: "AAA",
	created: createdDate + createdTime,
}

const users: model.User[] = [
	user,
	{ ...user, id: "AAAB" },
	{ ...user, id: "AAAC" },
	{ ...user, id: "aaaD" },
	{ ...user, id: "aaaE" },
	{ ...user, id: "aaaF" },
	{ ...user, id: "aaaG" },
]
