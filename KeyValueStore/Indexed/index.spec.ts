import * as storage from "../../index"

interface Type {
	name: { first: string; last: string }
	email: string
}
const joe = { name: { first: "Joe", last: "Doe" }, email: "joe@example.com" }
const jane = { name: { first: "Jane", last: "Smith" }, email: "jane@example.com" }
async function create(...data: Type[]): Promise<storage.KeyValueStore.Indexed<Type, "email" | "name"> | undefined> {
	const result = storage.KeyValueStore.Indexed.create<Type, "email" | "name">(storage.KeyValueStore.open<any>(), {
		email: item => item.email,
		name: item => `${item.name.first} ${item.name.last}`,
	})
	if (result)
		for (const item of data)
			await result.set(`${item.name.last.toLowerCase()} ${item.name.first.toLowerCase()}`, item)
	return result
}

describe("KeyValueStore.Indexed", () => {
	it("set get list", async () => {
		const store = await create()
		expect(store).toBeTruthy()
		if (store) {
			expect(await store.list()).toEqual([])
			expect(await store.get("doe joe")).toEqual(undefined)
			await store.set("doe joe", joe)
			expect(await store.get("doe joe")).toEqual({ value: joe })
			await store.set("smith jane", jane)
			expect(await store.list()).toEqual([
				{ key: "doe joe", value: joe },
				{ key: "smith jane", value: jane },
			])
		}
	})
	it("list name", async () => {
		const store = await create(joe, jane)
		expect(store).toBeTruthy()
		if (store) {
			expect(await store.list({ index: "name" })).toEqual([{ key: "smith jane" }, { key: "doe joe" }])
			expect(await store.list({ index: "name", values: true })).toEqual([
				{ key: "smith jane", value: jane },
				{ key: "doe joe", value: joe },
			])
		}
	})
})
