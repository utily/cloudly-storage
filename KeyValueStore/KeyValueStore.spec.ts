import * as isoly from "isoly"
import * as common from ".."

describe("common.KeyValueStore", () => {
	it("set get list", async () => {
		const store = common.KeyValueStore.open()
		expect(await store.list()).toEqual({ data: [] })
		expect(await store.get("alpha")).toEqual(undefined)
		await store.set("alpha", "1")
		expect(await store.get("alpha")).toEqual({ value: "1" })
		expect(await store.list()).toEqual({ data: [{ key: "alpha", value: "1" }] })
		console.log(await store.list())
	})
	it("expires", async () => {
		const now = isoly.DateTime.now()
		const store = common.KeyValueStore.open()
		const future = isoly.DateTime.nextMinute(now)
		const past = isoly.DateTime.previousMinute(now)
		await store.set("alpha", "1", { expires: future })
		expect(await store.get("alpha")).toEqual({ value: "1", expires: future })
		expect(await store.list()).toEqual({ data: [{ key: "alpha", value: "1", expires: future }] })
		await store.set("beta", "2", { expires: past })
		expect(await store.get("beta")).toEqual(undefined)
		expect(await store.list()).toEqual({ data: [{ key: "alpha", value: "1", expires: future }] })
	})
})
