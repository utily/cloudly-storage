import { Cursor } from "./index"

describe("Collection cursor", () => {
	const archiveCursor: Cursor.Archive = {
		type: "doc",
		start: "2022-01-01",
		end: "2022-01-01",
		limit: 5,
	}
	const bufferCursor: Cursor.Buffer = {
		type: "doc",
		start: "2022-01-01",
		end: "2022-01-01",
		limit: 5,
		shard: { AA: "item/doc/2022-01-01T22:22:22.222Z", AQ: "item/doc/2022-01-01T22:22:22.222Z" },
	}
	it("Create with created", async () => {
		const archiveSerialized = Cursor.Archive.serialize(archiveCursor)
		const collectionCursor = Cursor.Collection.create(archiveSerialized, bufferCursor)
		expect(Cursor.Buffer.parse(collectionCursor)).toEqual(bufferCursor)
		expect(Cursor.Archive.parse(collectionCursor)).toEqual(archiveCursor)
	})
	it("Create with cursor", async () => {
		const archiveCursorWithCursor = { ...archiveCursor, cursor: "blablabla" }
		const archiveSerialized = archiveCursor && Cursor.Archive.serialize(archiveCursorWithCursor)
		const collectionCursor = Cursor.Collection.create(archiveSerialized, bufferCursor)
		expect(typeof collectionCursor).toEqual("string")
		expect(Cursor.Buffer.parse(collectionCursor)).toEqual(bufferCursor)
		expect(Cursor.Archive.parse(collectionCursor)).toEqual(archiveCursorWithCursor)
		expect(
			Cursor.Buffer.parse(
				"eyJ0eXBlIjoiZG9jIiwibGltaXQiOjQsInN0YXJ0IjoiMjAyMi0wOC0xNSIsImVuZCI6IjIwMjItMDgtMTYiLCJzaGFyZCI6eyJBQSI6InVzZXJzL2RvYy8yMDIyLTA4LTE2VDAxOjUwOjAzLjY0OVovSkFBQSJ9fQ"
			)
		).toEqual({
			end: "2022-08-16",
			limit: 4,
			start: "2022-08-15",
			type: "doc",
			shard: { AA: "users/doc/2022-08-16T01:50:03.649Z/JAAA" },
		})
	})
})
