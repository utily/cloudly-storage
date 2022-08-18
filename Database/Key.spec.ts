import { Key } from "./Key"

describe("Key test", () => {
	it("getLast", () => {
		const key = "test/test/this"
		expect(Key.getLast(key)).toEqual("this")
	})
})
