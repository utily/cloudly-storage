import * as isoly from "isoly"
import * as worker from "../index"

describe("KeyValueStore", () => {
	it("set get list", async () => {
		const store = worker.KeyValueStore.open(undefined, "text")
		expect(await store.list()).toEqual({ data: [] })
		expect(await store.get("alpha")).toEqual(undefined)
		await store.set("alpha", "1")
		expect(await store.get("alpha")).toEqual({ value: "1" })
		expect(await store.list()).toEqual({ data: [{ key: "alpha", value: "1" }] })
	})
	it("expires", async () => {
		const now = isoly.DateTime.now()
		const future = isoly.DateTime.nextMinute(now)
		const past = isoly.DateTime.previousMinute(now)
		const store = worker.KeyValueStore.open()
		await store.set("alpha", "1", { expires: future })
		expect(await store.get("alpha")).toEqual({ value: "1" })
		expect(await store.list()).toEqual({ data: [{ key: "alpha", value: "1", expires: future }] })
		await store.set("beta", "2", { expires: past })
		expect(await store.get("beta")).toEqual(undefined)
		expect(await store.list()).toEqual({ data: [{ key: "alpha", value: "1", expires: future }] })
	})
	it("list w/o values", async () => {
		const store = worker.KeyValueStore.open()
		await store.set("alpha", "1")
		await store.set("beta", "2")
		expect(await store.list()).toEqual({
			data: [
				{ key: "alpha", value: "1" },
				{ key: "beta", value: "2" },
			],
		})
		expect(await store.list({ values: false })).toEqual({
			data: [{ key: "alpha" }, { key: "beta" }],
		})
	})
	it("json set get list", async () => {
		const store = worker.KeyValueStore.Json.create<{ property: number }>()
		expect(await store.list()).toEqual({ data: [] })
		expect(await store.get("alpha")).toEqual(undefined)
		await store.set("alpha", { property: 42 })
		expect(await store.get("alpha")).toEqual({ value: { property: 42 } })
		expect(await store.list()).toEqual({ data: [{ key: "alpha", value: { property: 42 } }] })
	})
	it("partition set get list", async () => {
		const backend = worker.KeyValueStore.Json.create<{ property: number }>()
		backend.set("outside", { property: 1337 })
		const store = worker.KeyValueStore.partition(backend, "partition-")
		expect(await store.list()).toEqual({ data: [] })
		expect(await store.get("alpha")).toEqual(undefined)
		await store.set("alpha", { property: 42 })
		expect(await store.get("alpha")).toEqual({ value: { property: 42 } })
		expect(await store.list()).toEqual({ data: [{ key: "alpha", value: { property: 42 } }] })
		expect(await backend.list()).toEqual({
			data: [
				{ key: "outside", value: { property: 1337 } },
				{ key: "partition-alpha", value: { property: 42 } },
			],
		})
	})
})
