import { TestSetup } from "../../../Context/TestSetup"
import * as model from "../../../model"

describe.each(TestSetup.partitions)("Collection update", ({ archive, collection, partitions }) => {
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
			const updated = await collection?.update({ id, groups })
			expect(model.User.is(updated)).toBeTruthy()
			const loaded = await collection?.load(id)
			expect(model.User.is(loaded)).toBeTruthy()
			expect(loaded?.groups).toEqual(groups)
		})
		it.each([
			{ id: TestSetup.collectionUsers[0].id, name: "buffer" },
			{ id: TestSetup.archiveUsers[0].id, name: "archive" },
		])("one string in $name", async ({ id }) => {
			const name = "newName"
			const updated = await collection?.update({ id, name })
			const loaded = await collection?.load(id)
			expect(model.User.is(loaded)).toBeTruthy()
			expect(loaded?.name).toEqual(name)
			expect(loaded?.name).toEqual(updated?.name)
		})
		it.each([
			{ users: TestSetup.collectionUsers, name: "buffer" },
			{ users: TestSetup.archiveUsers, name: "archive" },
		])("many arrays in $name", async ({ users }) => {
			const amendments = users.map(user => ({ id: user.id, groups: [user.name] }))
			const updated = await collection?.update(amendments)
			expect(updated?.every(model.User.is)).toBeTruthy()
			const listed = await collection?.load(users.map(user => user.id))
			expect(listed?.every(model.User.is)).toBeTruthy()
			expect(listed?.every(e => e?.groups[0] == e?.name)).toBeTruthy()
			expect(listed?.length).toEqual(users.length)
		})
		it.each([
			{ users: TestSetup.collectionUsers, name: "buffer" },
			{ users: TestSetup.archiveUsers, name: "archive" },
		])("many number in $name", async ({ users }) => {
			const level = 3
			const amendment = TestSetup.collectionUsers.map(user => ({ id: user.id, level }))
			const updated = await collection?.update(amendment)
			expect(updated?.every(model.User.is)).toBeTruthy()
			const listed = await collection?.load(TestSetup.collectionUsers.map(e => e.id))
			expect(listed?.every(model.User.is)).toBeTruthy()
			expect(listed?.every(e => e?.level == level)).toBeTruthy()
			expect(listed?.length).toEqual(TestSetup.collectionUsers.length)
		})
	})
})
