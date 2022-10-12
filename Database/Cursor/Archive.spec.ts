import { Selection } from "../Selection"
import { Cursor } from "./index"

describe("Selection", () => {
	it("simple", async () => {
		const selection: Selection = {
			created: { start: "2022-01-01", end: "2022-01-01" },
		}
		const cursor: Cursor | undefined = Cursor.Archive.from(selection)
		expect(cursor).toEqual({ end: "2022-01-01", limit: 500, start: "2022-01-01", type: "doc" })
		const serialized = cursor ? Cursor.Archive.serialize(cursor) : undefined
		expect(serialized).toEqual(
			"eyJsaW1pdCI6NTAwLCJzdGFydCI6IjIwMjItMDEtMDEiLCJlbmQiOiIyMDIyLTAxLTAxIiwidHlwZSI6ImRvYyJ9"
		)
		expect(Cursor.Archive.parse(serialized)).toEqual(cursor)
	})
	it("created limit", async () => {
		const selection: Selection = {
			limit: 5,
			created: { start: "2022-01-01", end: "2022-01-01" },
		}
		const cursor: Cursor | undefined = Cursor.Archive.from(selection)
		expect(cursor).toEqual({ end: "2022-01-01", limit: 5, start: "2022-01-01", type: "doc" })
		const serialized = cursor ? Cursor.Archive.serialize(cursor) : undefined
		expect(serialized).toEqual("eyJsaW1pdCI6NSwic3RhcnQiOiIyMDIyLTAxLTAxIiwiZW5kIjoiMjAyMi0wMS0wMSIsInR5cGUiOiJkb2MifQ")
		expect(Cursor.Archive.parse(serialized)).toEqual(cursor)
	})
})
