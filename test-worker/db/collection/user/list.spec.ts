import * as isoly from "isoly"
import * as storage from "cloudly-storage"
import { TestSetup } from "../../../Context/TestSetup"
import * as model from "../../../model"

describe.each([
	{ partitions: "noPartition" },
	{ partitions: "oneShard" },
	{ partitions: "twoShards" },
	{ partitions: "fourShards" },
])("Collection list", ({ partitions }) => {
	describe(`using ${partitions}`, () => {
		let db = TestSetup.collection
		beforeAll(async () => {
			let partitionedArchive = TestSetup.archive
			if (partitions != "noPartition") {
				db = TestSetup.collection?.partition(partitions)
				partitionedArchive = TestSetup.archive?.partition(partitions)
			}
			await partitionedArchive?.store(TestSetup.archiveUsers)
			await db?.store(TestSetup.collectionUsers)
		})

		it.each([
			{ id: TestSetup.collectionUsers[0].id, name: "buffer" },
			{ id: TestSetup.archiveUsers[0].id, name: "archive" },
		])("one id from $name", async ({ id, name }) => {
			const listed = await db?.load(id)
			expect(listed?.id).toEqual(id)
			expect(model.User.is(listed)).toBeTruthy()
		})

		it("a list of ids", async () => {
			const ids = [TestSetup.collectionUsers[0].id, TestSetup.collectionUsers[1].id, TestSetup.collectionUsers[2].id]
			const listed = await db?.load(ids)
			expect(listed?.length).toEqual(ids.length)
			expect(listed?.every(model.User.is)).toBeTruthy()
		})

		it("once with selection and cursor", async () => {
			const listed: (model.User[] & { cursor?: string }) | undefined = await db?.load(TestSetup.selection)
			const errorMargin = 0.1
			expect(listed?.length).toBeGreaterThanOrEqual(TestSetup.selection.limit * (1 - errorMargin))
			expect(listed?.length).toBeLessThanOrEqual(TestSetup.selection.limit * (1 + errorMargin))
			expect(listed?.cursor).toBeTruthy()
		})

		it("everything with selection and cursor", async () => {
			const results: model.User[] = []
			let currentSelection: storage.Selection = structuredClone(TestSetup.selection)
			let cursor: string | undefined = undefined
			do {
				const listed: (model.User[] & { cursor?: string }) | undefined = await db?.load(currentSelection)
				results.push(...(listed ?? []))
				cursor = listed?.cursor
				cursor && (currentSelection = { cursor })
			} while (cursor)
			expect(results?.length).toEqual(
				(TestSetup.collectionUsers.length + TestSetup.archiveUsers.length) *
					(TestSetup.selectionRange / TestSetup.dateSplit)
			)
			expect(cursor).toBeUndefined()
		})

		it("without selection", async () => {
			const listed = await db?.load()
			expect(listed?.every(model.User.is)).toBeTruthy()
			expect(listed?.length).toEqual(TestSetup.collectionUsers.length + TestSetup.archiveUsers.length)
			expect(
				listed?.every(
					e =>
						(e?.created ?? "") <= TestSetup.createdDate + TestSetup.createdTime &&
						(e?.created ?? "") >=
							isoly.Date.previous(TestSetup.createdDate, TestSetup.dateSplit - 1) + TestSetup.createdTime
				)
			).toBeTruthy()
		})
	})
})
