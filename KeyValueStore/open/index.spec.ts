import { isoly } from "isoly"
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
		const futureRetention = { minutes: 1 }
		const pastRetention = { minutes: -1 }
		const store = storage.KeyValueStore.open()
		await store.set("alpha", "1", { retention: futureRetention })
		expect(await store.get("alpha")).toEqual({ value: "1" })
		const listed = await store.list()
		expect(listed.map(e => ({ key: e.key, value: e.value }))).toEqual([{ key: "alpha", value: "1" }])
		expect(listed.every(e => (e?.expires ?? "") > isoly.DateTime.now())).toBeTruthy()
		await store.set("beta", "2", { retention: pastRetention })
		expect(await store.get("beta")).toEqual(undefined)
		expect(listed.map(e => ({ key: e.key, value: e.value }))).toEqual([{ key: "alpha", value: "1" }])
		expect(listed.every(e => (e?.expires ?? "") > isoly.DateTime.now())).toBeTruthy()
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
