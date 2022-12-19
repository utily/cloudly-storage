import { TestSetup } from "../../../Context/TestSetup"
import * as model from "../../../model"

describe.each(TestSetup.partitions)("Collection replace", ({ archive, collection, partitions }) => {
	describe(`using ${partitions} partitions`, () => {
		beforeAll(async () => {
			await collection?.store(TestSetup.collectionUsers)
			await archive?.store(TestSetup.archiveUsers)
		})
		it.each([
			{ db: collection, id: TestSetup.collectionUsers[0].id, name: "collection" },
			{ db: archive, id: TestSetup.archiveUsers[0].id, name: "archive" },
		])("$name", async ({ id, db, name }) => {
			const stored = await db?.load(id)
			const replaced = stored ? await db?.replace({ ...stored, name }) : undefined
			expect(model.User.is(replaced)).toBeTruthy()
			expect(replaced?.name).toEqual(name)
			const loaded = stored?.id ? await db?.load(stored?.id) : undefined
			expect(loaded?.name).toEqual(name)
		})
		it.each([{ db: collection, id: TestSetup.collectionUsers[0].id, name: "collection" }])(
			"with lock in $name",
			async ({ id, db, name }) => {
				const stored = await db?.load(id, { lock: { minutes: 1 } })
				const locked = await db?.load(id, { lock: { minutes: 1 } })
				const newName = "newName"
				expect(locked).toBeUndefined()
				const replaced = stored ? await db?.replace({ ...stored, name: newName }, true) : undefined
				expect(model.User.is(replaced)).toBeTruthy()
				expect(replaced?.name).toEqual(newName)
				const loaded = stored?.id ? await db?.load(stored?.id, { lock: { minutes: 1 } }) : undefined
				expect(loaded?.name).toEqual(newName)
			}
		)
	})
})
