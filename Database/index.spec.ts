import * as storage from "../index"
interface Item {
	value: number
}
type Layout = { archive: { items: Item } }

describe("Database Archive", () => {
	const configuration: storage.Database.Configuration = {
		silos: { items: { type: "archive", idLength: 4, retainChanged: true } },
	}
	const database: storage.Database<Layout> | undefined = storage.Database.create<Layout>(configuration)
	const partition = database?.partition("axb001")
	const emptyPartition = database?.partition("axb010")
	const item = { id: "abcd", created: "2022-07-30T00:17:55.730Z", changed: "2022-07-30T00:22:45.450Z", value: 42 }
	const item2 = { ...item, id: "bcde", created: "2022-07-30T00:17:55.730Z" }
	const selection = { created: { start: "2022-07-30", end: "2022-08-01" }, limit: 1 }
	it("create", async () => {
		expect(await partition?.items.store(item)).toEqual(item)
		expect(await partition?.items.store(item2)).toEqual(item2)
	})
	it("create again", async () => {
		expect(await partition?.items.store(item)).toEqual(undefined)
	})
	it("load from partition", async () => {
		expect(await partition?.items.load("abcd")).toEqual(item)
	})

	it("load from database", async () => {
		expect(await database?.items.load("abcd")).toEqual(item)
	})
	it("load from empty partition", async () => {
		expect(await emptyPartition?.items.load("abcd")).toEqual(undefined)
	})
	it("list", async () => {
		expect(await partition?.items.load()).toEqual([item, item2])
	})
	it("list with limit and prefix", async () => {
		const listed = await partition?.items.load(selection)
		expect(listed?.flat()).toEqual([item])
		expect(listed?.locus).toEqual(
			"eyJjcmVhdGVkIjp7InN0YXJ0IjoiMjAyMi0wNy0zMCIsImVuZCI6IjIwMjItMDgtMDEifSwibGltaXQiOjEsImN1cnNvciI6Iml0ZW1zL2RvYy9heGIwMDEvMjAyMi0wNy0zMFQwMDoxNzo1NS43MzBaL2FiY2QifQ"
		)
		const listedLocus = await partition?.items.load({ locus: listed?.locus })
		expect(listedLocus).toEqual([item2])
		expect(listedLocus?.locus).toEqual(undefined)
	})
})
