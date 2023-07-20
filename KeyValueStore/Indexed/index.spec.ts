import * as storage from "../../index"

interface Type {
	name: { first: string; last: string }
	email: string
	license?: string
}
const joe = { name: { first: "Joe", last: "Doe" }, email: "joe@example.com" }
const jane = { name: { first: "Jane", last: "Smith" }, email: "jane@example.com" }
async function create(
	...data: Type[]
): Promise<storage.KeyValueStore.Indexed<Type, "email" | "name" | "license"> | undefined> {
	const result = storage.KeyValueStore.Indexed.create<Type, "email" | "name" | "license">(
		storage.KeyValueStore.open<any>(),
		{
			email: item => item.email,
			name: item => `${item.name.first} ${item.name.last}`,
			license: item => item.license,
		}
	)
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
	it("exclude undefined", async () => {
		const store = await create(joe, jane)
		expect(store).toBeTruthy()
		if (store) {
			expect(await store.list({ index: "license" })).toEqual([])
			await store.set("doe joe", { ...joe, license: "111" })
			expect(await store.list({ index: "license" })).toEqual([{ key: "doe joe" }])
			await store.set("doe joe", joe)
			expect(await store.list({ index: "license" })).toEqual([])
		}
	})
	it("get indexed", async () => {
		const store = await create(joe, jane)
		expect(store).toBeTruthy()
		if (store) {
			expect(await store.get("doe joe")).toEqual({
				meta: undefined,
				value: { email: "joe@example.com", name: { first: "Joe", last: "Doe" } },
			})
			expect(await store.get("joe@example.com", "email")).toEqual({
				meta: undefined,
				value: { email: "joe@example.com", name: { first: "Joe", last: "Doe" } },
			})
			expect(await store.get("doe joe", "email")).toEqual(undefined)
		}
	})
})
