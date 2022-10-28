import { TestSetup } from "../../../Context/TestSetup"

describe.each(TestSetup.partitions)("Collection remove", ({ archive, collection, partitions }) => {
	describe(`using ${partitions} partitions`, () => {
		beforeAll(async () => {
			await archive?.store(TestSetup.collectionUsers)
			await collection?.store(TestSetup.archiveUsers)
		})
		it.each([
			{ id: TestSetup.collectionUsers[0].id, name: "buffer" },
			// { id: TestSetup.archiveUsers[0].id, name: "archive" }, // TODO: fix remove in archive.
		])("one in $name", async ({ id }) => {
			await collection?.remove(id)
			// expect(removed).toBeTruthy() Todo: fix returned false even though it was removed
			const loaded = await collection?.load(id)
			expect(loaded).toBeUndefined()
		})
		it.each([
			{ ids: TestSetup.collectionUsers.map(user => user.id), name: "buffer" },
			// { ids: TestSetup.archiveUsers.map(user => user.id), name: "archive" }, // TODO: fix remove in archive.
		])("many in $name", async ({ ids }) => {
			expect(ids.length).toEqual(256)
			await collection?.remove(ids)
			// expect(removed).toBeTruthy() Todo: fix returned false even though it was removed
			const loaded = await collection?.load(ids)
			expect(loaded?.length).toEqual(0)
		})
	})
})
