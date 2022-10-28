import { Selection } from "../../Selection"
import { Cursor } from "../index"

describe("Selection", () => {
	it("From undefined", async () => {
		expect(Cursor.Buffer.from(undefined)).toEqual({ limit: 500, type: "doc" })
	})
	it("From no shards", async () => {
		const selection: Selection = {
			cursor:
				Cursor.Collection.create(
					Cursor.Archive.serialize({
						end: "2022-08-16",
						limit: 4,
						start: "2022-08-15",
						type: "doc",
						cursor: "cloudflareCursor",
					}),
					undefined
				) ?? "ERROR",
		}
		expect(selection.cursor).not.toEqual("ERROR")
		expect(Cursor.Buffer.from(selection)).toEqual(undefined)
	})
	it("From shards", async () => {
		const selection: Selection = {
			cursor:
				Cursor.Collection.create(undefined, {
					end: "2022-08-16",
					limit: 4,
					start: "2022-08-15",
					type: "doc",
					shard: { AA: "key" },
				}) ?? "ERROR",
		}
		expect(Cursor.Buffer.from(selection)).toEqual({
			end: "2022-08-16",
			limit: 4,
			shard: { AA: "key" },
			start: "2022-08-15",
			type: "doc",
		})
	})
})
