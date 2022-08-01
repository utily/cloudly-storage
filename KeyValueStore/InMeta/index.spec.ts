import * as storage from "../../index"

describe("KeyValueStore.InMeta", () => {
	const joe = { name: "Joe Doe", email: "joe@example.com" }
	const jane = { name: "Jane Doe", email: "jane@example.com" }
	it("set get list", async () => {
		const store = storage.KeyValueStore.InMeta.create<{ name: string }, { email: string }>(({ email, name }) => [
			{ email },
			{ name },
		])
		expect(await store.list()).toEqual([])
		expect(await store.get("joe")).toEqual(undefined)
		await store.set("joe", joe)
		expect(await store.get("joe")).toEqual({ value: joe })
		await store.set("jane", jane)
		expect(await store.list({ values: true })).toEqual([
			{ key: "joe", value: joe },
			{ key: "jane", value: jane },
		])
	})
})
