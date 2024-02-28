import { isoly } from "isoly"
import { Document } from "./Document"

describe("Database Document", () => {
	const document: Document & Record<string, any> = {
		id: "test",
		created: isoly.DateTime.now(),
		changed: isoly.DateTime.now(),
		test: "testing",
		split: ["this", "should", "be", "in", "the", "second", "element"],
	}
	it("split", () => {
		expect(Document.split(document)).toEqual([
			{ id: document.id, changed: document.changed, created: document.created },
			{ test: document.test, split: document.split },
		])
	})
})
