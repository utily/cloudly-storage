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

describe("Database Archive", () => {
	const configuration: storage.Database.Configuration = {
		silos: { items: { type: "archive", idLength: 4, retainChanged: true } },
	}
	const database: storage.Database<Layout> | undefined = storage.Database.create<Layout>(configuration)
	const partition = database?.partition("axb001")
	const emptyPartition = database?.partition("axb010")
	const item = { id: "abcd", created: "2022-07-30T00:17:55.730Z", changed: "2022-07-30T00:22:45.450Z", value: 42 }
	const item2 = { ...item, id: "bcde", created: "2022-07-30T00:17:55.730Z" }
	const item3 = {
		level: 0,
		id: "qqaa",
		groups: [],
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
	it("create", async () => {
		expect(await partition?.items.store(item)).toEqual(item)
		expect(await partition?.items.store([item2, item3])).toEqual([item2, item3])
	})
	it("create again", async () => {
		expect(await partition?.items.store(item)).toEqual(undefined)
	})
	it("load from empty partition", async () => {
		expect(await emptyPartition?.items.load("abcd")).toEqual(undefined)
	})
	it("load by id from partition", async () => {
		expect(await partition?.items.load("abcd")).toEqual(item)
	})
	it("load by id from database", async () => {
		expect(await database?.items.load("abcd")).toEqual(item)
	})
	it("load list of ids", async () => {
		expect(await partition?.items.load([item.id, item2.id])).toEqual([item, item2])
	})
	it("list", async () => {
		expect(await partition?.items.load()).toEqual([item, item2, item3])
	})
	it("list with limit and prefix", async () => {
		const selection = { created: { start: "2022-07-30", end: "2022-08-01" }, limit: 1 }
		const listed = await partition?.items.load(selection)
		expect(listed?.flat()).toEqual([item])
		expect(listed?.locus).toEqual(
			"eyJjcmVhdGVkIjp7InN0YXJ0IjoiMjAyMi0wNy0zMCIsImVuZCI6IjIwMjItMDgtMDEifSwibGltaXQiOjEsImN1cnNvciI6Iml0ZW1zL2RvYy9heGIwMDEvMjAyMi0wNy0zMFQwMDoxNzo1NS43MzBaL2FiY2QifQ"
		)
		const listedLocus = await partition?.items.load({ locus: listed?.locus })
		expect(listedLocus).toEqual([item2])
		expect(listedLocus?.locus).toEqual(undefined)
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
		const item3Updated = {
			...item3,
			...firstAmendment,
			created: item3.created,
			groups: [...item3.groups, ...firstAmendment.groups],
		}
		const item3Appended = {
			...item3Updated,
			...secondAmendment,
			created: item3Updated.created,
			groups: [...item3Updated.groups, ...secondAmendment.groups],
		}
		expect(await partition?.items.update(firstAmendment)).toEqual(item3Updated)
		expect(await partition?.items.append(secondAmendment)).toEqual(item3Appended)
		expect(await partition?.items.load()).toEqual([item, item2, item3Appended])
	})
	it("remove", async () => {
		expect(await partition?.items.remove(item.id)).toEqual(true)
		expect(await partition?.items.remove([item2.id, item3.id])).toEqual([true, true])
		expect(await partition?.items.load()).toEqual([])
	})
})
