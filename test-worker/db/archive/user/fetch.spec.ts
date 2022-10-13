import { TestSetup } from "../../../Context/TestSetup"
import * as model from "../../../model"

describe.each(TestSetup.partitions)("Archive load", ({ partitions, archive }) => {
	describe(`using ${partitions}`, () => {
		beforeAll(async () => {
			await archive?.store(TestSetup.archiveUsers)
		})

		it.each([{ id: TestSetup.archiveUsers[0].id, name: "archive" }])("one id from user in $name", async ({ id }) => {
			const loaded = await archive?.load(id)
			expect(loaded?.id).toEqual(id)
			expect(model.User.is(loaded)).toBeTruthy()
		})
		it.each([
			{
				id: TestSetup.archiveUsers.slice(0, TestSetup.numberOfUsers / 2).map(user => user.id),
				name: "buffer",
			},
			{
				id: TestSetup.archiveUsers.slice(0, TestSetup.numberOfUsers / 2).map(user => user.id),
				name: "archive",
			},
		])(`${TestSetup.numberOfUsers / 2} users in $name`, async ({ id: ids }) => {
			const loaded = await archive?.load(ids)
			expect(loaded?.length).toEqual(ids.length)
			expect(loaded?.every(model.User.is)).toBeTruthy()
		})
	})
})
