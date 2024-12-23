import { describe, expect, it } from "vitest"
import { storage } from "../index"

interface Item {
	value?: number
	level?: number
	groups?: any[]
	name?: string
	address?: Record<string, any>
	created: string
}
type Layout = { archive: { items: Item } }

describe("Archive create, load, list", () => {
	const configuration: storage.Database.Configuration = {
		silos: { items: { type: "archive", idLength: 4, partitions: { axb010: { idLength: 8 } } } },
	}
	const database: storage.Database<Layout> | undefined = storage.Database.create<Layout>(configuration)
	const partition = database?.partition("axb001")
	const emptyPartition = database?.partition("axb010")
	const item = { id: "abc1", created: "2022-07-30T00:17:00.000Z", value: 42 }
	const item2 = { ...item, id: "abd2" }
	const item3 = { ...item, id: "abd3" }
	const item4 = { ...item, id: "abd4" }
	const item5 = {
		level: 0,
		id: "qqaa",
		groups: [],
		name: "Jamess",
		created: "2022-08-15T15:50:03.649Z",
		address: {
			street: "Torsgatan",
			zip: 7777,
			region: {
				city: "Gothenburg",
				country: "Sweden",
			},
		},
	}
	const selection = { created: { start: "2022-07-30", end: "2022-08-01" }, limit: 2 }

	it("create", async () => {
		expect(await partition?.items.store(item)).toMatchObject(item)
		expect(await partition?.items.store(item2)).toMatchObject(item2)
		expect(await partition?.items.store([item3, item4])).toMatchObject([item3, item4])
		expect(await partition?.items.store(item5)).toMatchObject(item5)
		expect(await partition?.items.store(item4)).toEqual(undefined)
	})
	it("create again", async () => {
		expect(await partition?.items.store(item)).toEqual(undefined)
	})
	it("load from empty partition", async () => {
		expect(await emptyPartition?.items.load("abcd")).toEqual(undefined)
	})
	it("load by id from partition", async () => {
		expect(await partition?.items.load("abc1")).toMatchObject(item)
	})
	it("load by id from database", async () => {
		expect(await database?.items.load("abc1")).toMatchObject(item)
	})
	it("load list of ids", async () => {
		expect(await partition?.items.load([item.id, item2.id])).toMatchObject([item, item2])
	})
	it("list", async () => {
		expect(await partition?.items.load()).toMatchObject([item, item2, item3, item4, item5])
	})
	it("list with limit and prefix", async () => {
		const listed = await partition?.items.load(selection)
		expect(listed?.flat()).toMatchObject([item, item2])
		expect(listed?.cursor).toEqual(
			"eyJsaW1pdCI6MiwicmFuZ2UiOnsiZW5kIjoiMjAyMi0wOC0wMSIsInN0YXJ0IjoiMjAyMi0wNy0zMCJ9LCJ0eXBlIjoiZG9jIiwiY3Vyc29yIjoiaXRlbXMvZG9jL2F4YjAwMS8yMDIyLTA3LTMwVDAwOjE3OjAwLjAwMFovYWJkMiJ9"
		)
		const listedLocus = listed?.cursor ? await partition?.items.load({ cursor: listed?.cursor }) : undefined
		expect(listedLocus?.flat()).toMatchObject([item3, item4])
		expect(listedLocus?.cursor).toEqual(undefined)
	})
	it("update, append, loadAll", async () => {
		const update = {
			level: 0,
			id: "qqaa",
			groups: ["group4"],
			name: "Jamess",
			created: "2022-08-15T15:50:03.649Z",
			address: {
				street: "Torsgatan",
				zip: 7777,
				region: {
					city: "Gothenburg",
					country: "Sweden",
				},
			},
		}
		expect(await partition?.items.update(update)).toMatchObject(update)
		expect(await partition?.items.load()).toMatchObject([item, item2, item3, item4, update])
	})
	it("remove", async () => {
		expect(await partition?.items.remove(item.id)).toEqual(true)
		expect(await partition?.items.remove([item2.id, item3.id, item5.id])).toEqual([true, true, true])
		expect(await partition?.items.load()).toMatchObject([item4])
	})
})
