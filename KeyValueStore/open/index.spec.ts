import * as isoly from "isoly"
import * as storage from "../../index"

describe("KeyValueStore.open", () => {
	it("set get list", async () => {
		const store = storage.KeyValueStore.open(undefined, "text")
		expect(await store.list()).toEqual([])
		expect(await store.get("alpha")).toEqual(undefined)
		await store.set("alpha", "1")
		expect(await store.get("alpha")).toEqual({ value: "1" })
		expect(await store.list()).toEqual([{ key: "alpha", value: "1" }])
	})
	it("expires", async () => {
		const now = isoly.DateTime.now()
		const future = isoly.DateTime.nextMinute(now)
		const past = isoly.DateTime.previousMinute(now)
		const store = storage.KeyValueStore.open()
		await store.set("alpha", "1", { expires: future })
		expect(await store.get("alpha")).toEqual({ value: "1" })
		expect(await store.list()).toEqual([{ key: "alpha", value: "1", expires: future }])
		await store.set("beta", "2", { expires: past })
		expect(await store.get("beta")).toEqual(undefined)
		expect(await store.list()).toEqual([{ key: "alpha", value: "1", expires: future }])
	})
	it("list w/o values", async () => {
		const store = storage.KeyValueStore.open()
		await store.set("alpha", "1")
		await store.set("beta", "2")
		expect(await store.list()).toEqual([
			{ key: "alpha", value: "1" },
			{ key: "beta", value: "2" },
		])
		expect(await store.list({ values: false })).toEqual([{ key: "alpha" }, { key: "beta" }])
	})
})
