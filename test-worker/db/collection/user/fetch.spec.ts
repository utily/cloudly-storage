import { TestSetup } from "../../../Context/TestSetup"
import * as model from "../../../model"

describe.each(TestSetup.partitions)("Collection load", ({ partitions, archive, collection }) => {
	describe(`using ${partitions}`, () => {
		beforeAll(async () => {
			await archive?.store(TestSetup.archiveUsers)
			await collection?.store(TestSetup.collectionUsers)
		})

		it.each([
			{ id: TestSetup.collectionUsers[0].id, name: "buffer" },
			{ id: TestSetup.archiveUsers[0].id, name: "archive" },
		])("one id from user in $name", async ({ id }) => {
			const loaded = await collection?.load(id)
			expect(loaded?.id).toEqual(id)
			expect(model.User.is(loaded)).toBeTruthy()
		})
		it.each([
			{
				id: TestSetup.collectionUsers.slice(0, TestSetup.numberOfUsers / 2).map(user => user.id),
				name: "buffer",
			},
			{
				id: TestSetup.archiveUsers.slice(0, TestSetup.numberOfUsers / 2).map(user => user.id),
				name: "archive",
			},
		])(`${TestSetup.numberOfUsers / 2} users in $name`, async ({ id: ids }) => {
			const loaded = await collection?.load(ids)
			expect(loaded?.length).toEqual(ids.length)
			expect(loaded?.every(model.User.is)).toBeTruthy()
		})
	})
})
