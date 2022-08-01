import * as storage from "../../index"

describe("KeyValueStore.Json", () => {
	it("set get list", async () => {
		const store = storage.KeyValueStore.Json.create<{ property: number }>()
		expect(await store.list()).toEqual([])
		expect(await store.get("alpha")).toEqual(undefined)
		await store.set("alpha", { property: 42 })
		expect(await store.get("alpha")).toEqual({ value: { property: 42 } })
		expect(await store.list()).toEqual([{ key: "alpha", value: { property: 42 } }])
	})
	it("partition set get list", async () => {
		const backend = storage.KeyValueStore.Json.create<{ property: number }>()
		backend.set("outside", { property: 1337 })
		const store = storage.KeyValueStore.partition(backend, "partition-")
		expect(await store.list()).toEqual([])
		expect(await store.get("alpha")).toEqual(undefined)
		await store.set("alpha", { property: 42 })
		expect(await store.get("alpha")).toEqual({ value: { property: 42 } })
		expect(await store.list()).toEqual([{ key: "alpha", value: { property: 42 } }])
		expect(await backend.list()).toEqual([
			{ key: "outside", value: { property: 1337 } },
			{ key: "partition-alpha", value: { property: 42 } },
		])
	})
})
