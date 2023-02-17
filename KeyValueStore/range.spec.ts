import * as storage from "../index"
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
			{
				expires: undefined,
				key: "w9UzQ",
				meta: undefined,
				value: {
					data: "Data: w9UzQ",
				},
			},
			{
				expires: undefined,
				key: "9QVMX",
				meta: undefined,
				value: {
					data: "Data: 9QVMX",
				},
			},
			{
				expires: undefined,
				key: "zMSAb",
				meta: undefined,
				value: {
					data: "Data: zMSAb",
				},
			},
			{
				expires: undefined,
				key: "QXtbZ",
				meta: undefined,
				value: {
					data: "Data: QXtbZ",
				},
			},
			{
				expires: undefined,
				key: "UVySt",
				meta: undefined,
				value: {
					data: "Data: UVySt",
				},
			},
			{
				expires: undefined,
				key: "MbH0l",
				meta: undefined,
				value: {
					data: "Data: MbH0l",
				},
			},
			{
				expires: undefined,
				key: "GFkv2",
				meta: undefined,
				value: {
					data: "Data: GFkv2",
				},
			},
			{
				expires: undefined,
				key: "XZJlC",
				meta: undefined,
				value: {
					data: "Data: XZJlC",
				},
			},
			{
				expires: undefined,
				key: "A0Ro8",
				meta: undefined,
				value: {
					data: "Data: A0Ro8",
				},
			},
			{
				expires: undefined,
				key: "VtmHJ",
				meta: undefined,
				value: {
					data: "Data: VtmHJ",
				},
			},
			{
				expires: undefined,
				key: "cdq7f",
				meta: undefined,
				value: {
					data: "Data: cdq7f",
				},
			},
			{
				expires: undefined,
				key: "blp8D",
				meta: undefined,
				value: {
					data: "Data: blp8D",
				},
			},
			{
				expires: undefined,
				key: "E1zTB",
				meta: undefined,
				value: {
					data: "Data: E1zTB",
				},
			},
			{
				expires: undefined,
				key: "F2XiP",
				meta: undefined,
				value: {
					data: "Data: F2XiP",
				},
			},
			{
				expires: undefined,
				key: "SHERp",
				meta: undefined,
				value: {
					data: "Data: SHERp",
				},
			},
			{
				expires: undefined,
				key: "ZC0D9",
				meta: undefined,
				value: {
					data: "Data: ZC0D9",
				},
			},
			{
				expires: undefined,
				key: "hLOYM",
				meta: undefined,
				value: {
					data: "Data: hLOYM",
				},
			},
			{
				expires: undefined,
				key: "082sV",
				meta: undefined,
				value: {
					data: "Data: 082sV",
				},
			},
			{
				expires: undefined,
				key: "K57eF",
				meta: undefined,
				value: {
					data: "Data: K57eF",
				},
			},
			{
				expires: undefined,
				key: "tJ5p0",
				meta: undefined,
				value: {
					data: "Data: tJ5p0",
				},
			},
		])
	})
	it("range", async () => {
		expect(await store.list({ limit: 100, range: ["a", "g"] })).toEqual([
			{
				expires: undefined,
				key: "cdq7f",
				meta: undefined,
				value: {
					data: "Data: cdq7f",
				},
			},
			{
				expires: undefined,
				key: "blp8D",
				meta: undefined,
				value: {
					data: "Data: blp8D",
				},
			},
		])
		const res1 = await store.list({ limit: 6, range: ["A", "a"] })

		const res1Equal = storage.Continuable.create(
			[
				{
					expires: undefined,
					key: "QXtbZ",
					meta: undefined,
					value: {
						data: "Data: QXtbZ",
					},
				},
				{
					expires: undefined,
					key: "UVySt",
					meta: undefined,
					value: {
						data: "Data: UVySt",
					},
				},
				{
					expires: undefined,
					key: "MbH0l",
					meta: undefined,
					value: {
						data: "Data: MbH0l",
					},
				},
				{
					expires: undefined,
					key: "GFkv2",
					meta: undefined,
					value: {
						data: "Data: GFkv2",
					},
				},
				{
					expires: undefined,
					key: "XZJlC",
					meta: undefined,
					value: {
						data: "Data: XZJlC",
					},
				},
				{
					expires: undefined,
					key: "A0Ro8",
					meta: undefined,
					value: {
						data: "Data: A0Ro8",
					},
				},
			],
			"QTBSbzg"
		)
		for (let i = 0; i < res1.length; i++)
			expect(res1[i].key == res1Equal[i].key).toEqual(true)
		expect(res1.cursor).toEqual("QTBSbzg")
		const res2 = await store.list({ cursor: res1.cursor, limit: 6, range: ["A", "a"] })
		expect(res2).toEqual([
			{
				expires: undefined,
				key: "VtmHJ",
				meta: undefined,
				value: {
					data: "Data: VtmHJ",
				},
			},
			{
				expires: undefined,
				key: "E1zTB",
				meta: undefined,
				value: {
					data: "Data: E1zTB",
				},
			},
			{
				expires: undefined,
				key: "F2XiP",
				meta: undefined,
				value: {
					data: "Data: F2XiP",
				},
			},
			{
				expires: undefined,
				key: "SHERp",
				meta: undefined,
				value: {
					data: "Data: SHERp",
				},
			},
			{
				expires: undefined,
				key: "ZC0D9",
				meta: undefined,
				value: {
					data: "Data: ZC0D9",
				},
			},
			{
				expires: undefined,
				key: "K57eF",
				meta: undefined,
				value: {
					data: "Data: K57eF",
				},
			},
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
