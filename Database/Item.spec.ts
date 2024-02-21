import { isoly } from "isoly"
import { Item } from "./Item"

describe("Database Document", () => {
	const item: Item & Record<string, any> = {
		meta: { id: "test", created: isoly.DateTime.now(), changed: isoly.DateTime.now() },
		value: {
			test: "testing",
			split: ["this", "should", "be", "in", "the", "second", "element"],
		},
	}
	it("split", () => {
		expect(Item.is(item)).toBeTruthy()
	})
})
