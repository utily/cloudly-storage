import * as storage from "../index"
import { ListOptions } from "./ListOptions"

describe("range", () => {
	const store = storage.KeyValueStore.Json.create()
	const randChar = (j: number): string => {
		const chars = "6UVStyHkJRmqpzXE0O2754DjgwMcZv1x8NnYP3QAFKluLTfasI9GbhdoCWirBe"
		return chars[(j * 54876349) % 62]
	}
	it("setStore", async () => {
		for (let i = 1; i < 51; i++) {
			const key = randChar(i) + randChar(i * 2) + randChar(i * 5) + randChar(i * 3) + randChar(i * 4)
			await store.set(key, { data: `Data: ${key}` })
		}
		const options: ListOptions = { limit: 100 }
		expect(await store.list(options)).toMatchSnapshot()
	})
	it("range", async () => {
		expect(await store.list({ limit: 100, range: ["a", "g"] })).toMatchSnapshot()
		const res1 = await store.list({ limit: 10, range: ["A", "a"] })
		expect(res1).toMatchSnapshot()
		expect(res1.cursor).toEqual("U0hFUnA")
		const res2 = await store.list({ cursor: res1.cursor, limit: 10, range: ["A", "a"] })
		expect(res2).toMatchSnapshot()
		expect(res2.cursor).toEqual("TnRLM0o")
		const res3 = await store.list({ cursor: res2.cursor, limit: 10, range: ["A", "a"] })
		expect(res3).toMatchSnapshot()
		expect(res3.cursor).toEqual(undefined)
	})
	it("Cursor", async () => {
		const options1: ListOptions = { cursor: "RG9uJ3QgZXhpc3Q=", limit: 1 }
		expect(await store.list(options1)).toEqual([])
		const options2: ListOptions = { limit: 1, range: ["A", "z"], cursor: "RG9uJ3QgZXhpc3Q=" }
		expect(await store.list(options2)).toEqual([])
	})
})
