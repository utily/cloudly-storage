import * as storage from "../index"
interface Item {
	value?: number
	level?: number
	groups?: any[]
	name?: string
	address?: Record<string, any>
	created: string
	changed: string
}
type Layout = { archive: { items: Item } }

describe("Archive create, load, list", () => {
	const configuration: storage.Database.Configuration = {
		silos: { items: { type: "archive", idLength: 4, retainChanged: true, partitions: { axb010: { idLength: 8 } } } },
	}
	const database: storage.Database<Layout> | undefined = storage.Database.create<Layout>(configuration)
	const partition = database?.partition("axb001")
	const emptyPartition = database?.partition("axb010")
	const item = { id: "abc1", created: "2022-07-30T00:17:00.000Z", changed: "2022-07-30T00:22:00.000Z", value: 42 }
	const item2 = { ...item, id: "abd2", changed: "2022-07-30T00:22:00.000Z" }
	const item3 = { ...item, id: "abd3", changed: "2022-07-30T00:24:00.000Z" }
	const item4 = { ...item, id: "abd4", changed: "2022-07-30T00:25:00.000Z" }
	const item5 = {
		level: 0,
		id: "qqaa",
		groups: [],
		name: "Jamess",
		created: "2022-08-15T15:50:03.649Z",
		changed: "2022-07-30T00:27:45.450Z",
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
		expect(await partition?.items.store(item)).toEqual(item)
		expect(await partition?.items.store(item2)).toEqual(item2)
		expect(await partition?.items.store([item3, item4])).toEqual([item3, item4])
		expect(await partition?.items.store(item5)).toEqual(item5)
		expect(await partition?.items.store(item4)).toEqual(undefined)
	})
	it("create again", async () => {
		expect(await partition?.items.store(item)).toEqual(undefined)
	})
	it("load from empty partition", async () => {
		expect(await emptyPartition?.items.load("abcd")).toEqual(undefined)
	})
	it("load by id from partition", async () => {
		expect(await partition?.items.load("abc1")).toEqual(item)
	})
	it("load by id from database", async () => {
		expect(await database?.items.load("abc1")).toEqual(item)
	})
	it("load list of ids", async () => {
		expect(await partition?.items.load([item.id, item2.id])).toEqual([item, item2])
	})
	it("list", async () => {
		expect(await partition?.items.load()).toEqual([item, item2, item3, item4, item5])
	})
	it("list with limit and prefix", async () => {
		const listed = await partition?.items.load(selection)
		expect(listed?.flat()).toEqual([item, item2])
		expect(listed?.cursor).toEqual(
			"eyJsaW1pdCI6MiwicmFuZ2UiOnsic3RhcnQiOiIyMDIyLTA3LTMwIiwiZW5kIjoiMjAyMi0wOC0wMSJ9LCJ0eXBlIjoiZG9jIiwiY3Vyc29yIjoiaXRlbXMvZG9jL2F4YjAwMS8yMDIyLTA3LTMwVDAwOjE3OjAwLjAwMFovYWJkMiJ9"
		)
		const listedLocus = listed?.cursor ? await partition?.items.load({ cursor: listed?.cursor }) : undefined
		expect(listedLocus?.flat()).toEqual([item3, item4])
		expect(listedLocus?.cursor).toEqual(undefined)
	})
	it("list using changed query", async () => {
		const listed = await partition?.items.load({ changed: selection.created, limit: 3 })
		expect(listed?.flat()).toEqual([item, item2, item3])
		expect(listed?.cursor).toEqual(
			"eyJsaW1pdCI6MywicmFuZ2UiOnsic3RhcnQiOiIyMDIyLTA3LTMwVDAwOjI1OjAwLjAwMFoiLCJlbmQiOiIyMDIyLTA4LTAxIn0sInR5cGUiOiJjaGFuZ2VkIn0"
		)
		const listedFromCursor = listed?.cursor ? await partition?.items.load({ cursor: listed?.cursor }) : undefined
		expect(listedFromCursor).toEqual([item4])
	})
	it("update, append, loadAll", async () => {
		const firstAmendment = {
			level: 0,
			id: "qqaa",
			groups: ["group4"],
			name: "Jamess",
			created: "2022-08-15T15:50:03.649Z",
			changed: "2022-07-30T00:22:45.450Z",
			address: {
				street: "Torsgatan",
				zip: 7777,
				region: {
					city: "Gothenburg",
					country: "Sweden",
				},
			},
		}
		const secondAmendment = {
			level: 0,
			id: "qqaa",
			groups: ["group5"],
			name: "Lars",
			created: "2022-08-01T15:50:03.649Z",
			address: {
				street: "Torsgatan",
				zip: 7777,
				region: {
					city: "Uppsala",
					country: "Sweden",
					county: "Uppland",
				},
			},
		}
		const item5Updated = {
			...item5,
			...firstAmendment,
			created: item5.created,
			groups: [...item5.groups, ...firstAmendment.groups],
		}
		const item5Appended = {
			...item5Updated,
			...secondAmendment,
			created: item5Updated.created,
			groups: [...item5Updated.groups, ...secondAmendment.groups],
		}
		expect(await partition?.items.update(firstAmendment)).toEqual(item5Updated)
		expect(await partition?.items.append(secondAmendment)).toEqual(item5Appended)
		expect(await partition?.items.load()).toEqual([item, item2, item3, item4, item5Appended])
	})
	it("remove", async () => {
		expect(await partition?.items.remove(item.id)).toEqual(true)
		expect(await partition?.items.remove([item2.id, item3.id, item5.id])).toEqual([true, true, true])
		expect(await partition?.items.load()).toEqual([item4])
	})
})
