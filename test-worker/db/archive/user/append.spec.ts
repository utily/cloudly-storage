import { TestSetup } from "../../../Context/TestSetup"
import { TestStorage } from "../../../Context/TestStorage"
import * as model from "../../../model"

const archive = TestStorage.archive?.users
const user = TestSetup.user
const users = TestSetup.archiveUsers
const partitioned = archive?.partition("one")
const partitioned2 = partitioned?.partition("two")

describe.each([
	{ db: archive, partitions: "no" },
	{ db: partitioned, partitions: "one" },
	{ db: partitioned2, partitions: "two" },
])("Archive append", ({ db, partitions }) => {
	describe(`using ${partitions} partitions`, () => {
		beforeAll(async () => {
			await db?.store(users)
			await db?.store(user)
		})
		it("one array", async () => {
			const groups = ["first"]
			const appended = await db?.append({ id: user.id, groups })
			expect(model.User.is(appended)).toBeTruthy()
			const loaded = await db?.load(user.id)
			expect(model.User.is(loaded)).toBeTruthy()
			expect(loaded?.groups).toEqual(groups)
			expect(loaded?.groups).toEqual(appended?.groups)
		})
		it("one string", async () => {
			const name = "newName"
			const appended = await db?.append({ id: user.id, name })
			const loaded = await db?.load(user.id)
			expect(model.User.is(loaded)).toBeTruthy()
			expect(loaded?.name).toEqual(name)
			expect(loaded?.name).toEqual(appended?.name)
		})
		it("many arrays", async () => { //continue from here
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
		it("many numbers", async () => {
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
})

const createdDate = "2022-08-15"
const createdTime = "T01:50:03.649Z"
