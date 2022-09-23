import { Cursor } from "./Cursor"
import { Selection } from "./Selection"

describe("Selection", () => {
	it("simple", async () => {
		const selection: Selection = {
			created: { start: "2022-01-01", end: "2022-01-01" },
		}
		const cursor: Cursor | undefined = Cursor.from(selection)
		expect(cursor).toEqual({ range: { end: "2022-01-01", start: "2022-01-01" }, type: "doc", limit: 500 })
		const serialized = cursor ? Cursor.serialize(cursor) : undefined
		expect(serialized).toEqual(
			"eyJsaW1pdCI6NTAwLCJyYW5nZSI6eyJzdGFydCI6IjIwMjItMDEtMDEiLCJlbmQiOiIyMDIyLTAxLTAxIn0sInR5cGUiOiJkb2MifQ"
		)
		expect(Cursor.parse(serialized)).toEqual(cursor)
	})
})
