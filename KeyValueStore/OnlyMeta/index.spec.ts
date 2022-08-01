import * as storage from "../../index"

describe("KeyValueStore.OnlyMeta", () => {
	const joe = { name: "Joe Doe", email: "joe@example.com" }
	const jane = { name: "Jane Doe", email: "jane@example.com" }
	it("set get list", async () => {
		const store = storage.KeyValueStore.OnlyMeta.create<{ name: string; email: string }>()
		expect(await store.list()).toEqual([])
		expect(await store.get("joe")).toEqual(undefined)
		await store.set("joe", joe)
		expect(await store.get("joe")).toEqual({ value: joe })
		await store.set("jane", jane)
		expect(await store.list()).toEqual([
			{ key: "joe", value: joe },
			{ key: "jane", value: jane },
		])
	})
})
