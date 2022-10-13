import { TestSetup } from "../../../Context/TestSetup"
import * as model from "../../../model"

describe.each(TestSetup.partitions)("Collection append", ({ archive, collection, partitions }) => {
	describe(`using ${partitions} partitions`, () => {
		beforeAll(async () => {
			await archive?.store(TestSetup.collectionUsers)
			await collection?.store(TestSetup.archiveUsers)
		})
		it("one array", async () => {
			const id = TestSetup.collectionUsers[0].id
			const groups = ["first"]
			const appended = await collection?.append({ id, groups })
			expect(model.User.is(appended)).toBeTruthy()
			const loaded = await collection?.load(id)
			expect(model.User.is(loaded)).toBeTruthy()
			expect(loaded?.groups).toEqual([...TestSetup.collectionUsers[0].groups, ...groups])
		})
		// it("one string", async () => {
		// 	const id = TestSetup.collectionUsers[0].id
		// 	const name = "newName"
		// 	const appended = await collection?.append({ id, name })
		// 	const loaded = await collection?.load(id)
		// 	expect(model.User.is(loaded)).toBeTruthy()
		// 	expect(loaded?.name).toEqual(name)
		// 	expect(loaded?.name).toEqual(appended?.name)
		// })
		// it("many arrays", async () => {
		// 	const amendments = TestSetup.collectionUsers.map(user => ({ id: user.id, groups: [user.name] }))
		// 	const appended = await collection?.append(amendments)
		// 	expect(appended?.every(model.User.is)).toBeTruthy()
		// 	const listed = await collection?.load(TestSetup.collectionUsers.map(user => user.id))
		// 	expect(listed?.every(model.User.is)).toBeTruthy()
		// 	expect(listed?.every(e => e?.groups.slice(-1)[0] == e?.name)).toBeTruthy()
		// 	expect(listed?.length).toEqual(TestSetup.collectionUsers.length)
		// 	const appended2 = await collection?.append(amendments)
		// 	expect(
		// 		appended2?.every(
		// 			e =>
		// 				e?.groups.every(g => g == e?.name) &&
		// 				e.groups.length == TestSetup.user.groups.length + 2 &&
		// 				e?.created == TestSetup.createdDate + TestSetup.createdTime
		// 		)
		// 	).toBeTruthy()
		// })
		// it("many numbers", async () => {
		// 	const level = 3
		// 	const amendment = TestSetup.collectionUsers.map(user => ({ id: user.id, level }))
		// 	const appended = await collection?.append(amendment)
		// 	expect(appended?.every(model.User.is)).toBeTruthy()
		// 	const listed = await collection?.load(TestSetup.collectionUsers.map(e => e.id))
		// 	expect(listed?.every(model.User.is)).toBeTruthy()
		// 	expect(
		// 		listed?.every(e => e?.level == level && e.created == TestSetup.createdDate + TestSetup.createdTime)
		// 	).toBeTruthy()
		// 	expect(listed?.length).toEqual(TestSetup.collectionUsers.length)
		// })
	})
})
