import { describe, expect, it } from "vitest"
import { storage } from "../index"
import { ListOptions } from "./ListOptions"

describe("range", () => {
	const store = storage.KeyValueStore.Json.create()
	const randChar = (j: number): string => {
		const chars = "6UVStyHkJRmqpzXE0O2754DjgwMcZv1x8NnYP3QAFKluLTfasI9GbhdoCWirBe"
		return chars[(j * 54876349) % 62]
	}
	it("setStore", async () => {
		for (let i = 1; i < 21; i++) {
			const key = randChar(i) + randChar(i * 2) + randChar(i * 5) + randChar(i * 3) + randChar(i * 4)
			await store.set(key, { data: `Data: ${key}` })
		}
		const options: ListOptions = { limit: 100 }
		expect(await store.list(options)).toEqual([
			{ key: "082sV", value: { data: "Data: 082sV" } },
			{ key: "9QVMX", value: { data: "Data: 9QVMX" } },
			{ key: "A0Ro8", value: { data: "Data: A0Ro8" } },
			{ key: "blp8D", value: { data: "Data: blp8D" } },
			{ key: "cdq7f", value: { data: "Data: cdq7f" } },
			{ key: "E1zTB", value: { data: "Data: E1zTB" } },
			{ key: "F2XiP", value: { data: "Data: F2XiP" } },
			{ key: "GFkv2", value: { data: "Data: GFkv2" } },
			{ key: "hLOYM", value: { data: "Data: hLOYM" } },
			{ key: "K57eF", value: { data: "Data: K57eF" } },
			{ key: "MbH0l", value: { data: "Data: MbH0l" } },
			{ key: "QXtbZ", value: { data: "Data: QXtbZ" } },
			{ key: "SHERp", value: { data: "Data: SHERp" } },
			{ key: "tJ5p0", value: { data: "Data: tJ5p0" } },
			{ key: "UVySt", value: { data: "Data: UVySt" } },
			{ key: "VtmHJ", value: { data: "Data: VtmHJ" } },
			{ key: "w9UzQ", value: { data: "Data: w9UzQ" } },
			{ key: "XZJlC", value: { data: "Data: XZJlC" } },
			{ key: "ZC0D9", value: { data: "Data: ZC0D9" } },
			{ key: "zMSAb", value: { data: "Data: zMSAb" } },
		])
	})
	it("range", async () => {
		expect(await store.list({ limit: 100, range: ["a", "g"] })).toEqual([
			{
				key: "blp8D",
				value: {
					data: "Data: blp8D",
				},
			},
			{
				key: "cdq7f",
				value: {
					data: "Data: cdq7f",
				},
			},
		])
		const res1 = await store.list({ limit: 6, range: ["A", "a"] })

		const res1Equal = storage.Continuable.create(
			[
				{ key: "A0Ro8", value: { data: "Data: A0Ro8" } },
				{ key: "E1zTB", value: { data: "Data: E1zTB" } },
				{ key: "F2XiP", value: { data: "Data: F2XiP" } },
				{ key: "GFkv2", value: { data: "Data: GFkv2" } },
				{ key: "K57eF", value: { data: "Data: K57eF" } },
				{ key: "MbH0l", value: { data: "Data: MbH0l" } },
			],
			"TWJIMGw"
		)
		expect(JSON.stringify(res1)).toEqual(JSON.stringify(res1Equal))
		for (let i = 0; i < res1.length; i++)
			expect(res1[i].key).toEqual(res1Equal[i].key)
		expect(res1.cursor).toEqual("TWJIMGw")
		const res2 = await store.list({ cursor: res1.cursor, limit: 6, range: ["A", "a"] })
		expect(res2).toEqual([
			{ key: "QXtbZ", value: { data: "Data: QXtbZ" } },
			{ key: "SHERp", value: { data: "Data: SHERp" } },
			{ key: "UVySt", value: { data: "Data: UVySt" } },
			{ key: "VtmHJ", value: { data: "Data: VtmHJ" } },
			{ key: "XZJlC", value: { data: "Data: XZJlC" } },
			{ key: "ZC0D9", value: { data: "Data: ZC0D9" } },
		])
		expect(res2.cursor).toEqual(undefined)
	})
	it("Cursor", async () => {
		const options1: ListOptions = { cursor: "RG9uJ3QgZXhpc3Q=", limit: 20 }
		expect(await store.list(options1)).toEqual([])
		const options2: ListOptions = { limit: 1, range: ["A", "z"], cursor: "RG9uJ3QgZXhpc3Q=" }
		expect(await store.list(options2)).toEqual([])
	})
})
