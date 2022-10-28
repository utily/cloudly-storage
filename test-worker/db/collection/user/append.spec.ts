import { TestSetup } from "../../../Context/TestSetup"
import * as model from "../../../model"

describe.each(TestSetup.partitions)("Collection append", ({ archive, collection, partitions }) => {
	describe(`using ${partitions} partitions`, () => {
		beforeAll(async () => {
			await archive?.store(TestSetup.collectionUsers)
			await collection?.store(TestSetup.archiveUsers)
		})
		it.each([
			{ id: TestSetup.collectionUsers[0].id, name: "buffer" },
			{ id: TestSetup.archiveUsers[0].id, name: "archive" },
		])("one array in $name", async ({ id }) => {
			const groups = ["first"]
			const appended = await collection?.append({ id, groups })
			expect(model.User.is(appended)).toBeTruthy()
			const loaded = await collection?.load(id)
			expect(model.User.is(loaded)).toBeTruthy()
			expect(loaded?.groups).toEqual([...TestSetup.collectionUsers[0].groups, ...groups])
		})
		it.each([
			{ id: TestSetup.collectionUsers[0].id, name: "buffer" },
			{ id: TestSetup.archiveUsers[0].id, name: "archive" },
		])("one string in $name", async ({ id }) => {
			const name = "newName"
			const appended = await collection?.append({ id, name })
			const loaded = await collection?.load(id)
			expect(model.User.is(loaded)).toBeTruthy()
			expect(loaded?.name).toEqual(name)
			expect(loaded?.name).toEqual(appended?.name)
		})
		it.each([
			{ users: TestSetup.collectionUsers, name: "buffer" },
			{ users: TestSetup.archiveUsers, name: "archive" },
		])("many arrays in $name", async ({ users }) => {
			const amendments = users.map(user => ({ id: user.id, groups: [user.name] }))
			const appended = await collection?.append(amendments)
			expect(appended?.every(model.User.is)).toBeTruthy()
			const listed = await collection?.load(users.map(user => user.id))
			expect(listed?.every(model.User.is)).toBeTruthy()
			expect(listed?.every(e => e?.groups.slice(-1)[0] == e?.name)).toBeTruthy()
			expect(listed?.length).toEqual(users.length)
			const appended2 = await collection?.append(amendments)
			expect(
				appended2?.every(
					e => e?.groups.slice(-2).every(g => g == e?.name) && e.groups.length == TestSetup.user.groups.length + 2
				)
			).toBeTruthy()
		})
		it.each([
			{ users: TestSetup.collectionUsers, name: "buffer" },
			{ users: TestSetup.archiveUsers, name: "archive" },
		])("many number in $name", async ({ users }) => {
			const level = 3
			const amendment = TestSetup.collectionUsers.map(user => ({ id: user.id, level }))
			const appended = await collection?.append(amendment)
			expect(appended?.every(model.User.is)).toBeTruthy()
			const listed = await collection?.load(TestSetup.collectionUsers.map(e => e.id))
			expect(listed?.every(model.User.is)).toBeTruthy()
			expect(listed?.every(e => e?.level == level)).toBeTruthy()
			expect(listed?.length).toEqual(TestSetup.collectionUsers.length)
		})
	})
})
