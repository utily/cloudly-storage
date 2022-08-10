import * as storage from "../index"

interface Item {
	value: number
}
type Layout = { archive: { items: Item } }

describe("Database", () => {
	it("create", async () => {
		const configuration: storage.Database.Configuration = {
			silos: { items: { type: "archive", idLength: 4, retainChanged: true } },
		}
		const database: storage.Database<Layout> | undefined = storage.Database.create<Layout>(configuration)
		const partitioned = database?.partition("axb001")
		const emptyPartition = database?.partition("axb002")
		const item = { id: "abcd", created: "2022-07-30T00:17:55.730Z", changed: "2022-07-30T00:22:45.450Z", value: 42 }
		expect(await partitioned?.items.store(item)).toEqual(item)
		expect(await partitioned?.items.store(item)).toEqual(undefined)
		const item2 = { ...item, id: "bcde" }
		expect(await partitioned?.items.store(item2)).toEqual(item2)
		expect(await partitioned?.items.load("abcd")).toEqual(item)
		expect(await database?.items.load("abcd")).toEqual(item)
		expect(await emptyPartition?.items.load("abcd")).toEqual(undefined)
		// expect(await partitioned?.items.load({ created: { start: "2022-07-30", end: "2022-07-30" } })).toEqual([
		// 	item,
		// 	item2,
		// ])
	})
})
