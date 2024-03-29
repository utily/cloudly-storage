import { isoly } from "isoly"
import * as model from "./index"

describe("User tests", () => {
	it("User is test", () => {
		const user: model.User = { level: 1, name: "testsson", id: "abcd", groups: [], created: isoly.DateTime.now() }
		const notUser = { level: "1", name: "testsson", id: "abcd", groups: [], created: isoly.DateTime.now() }
		expect(model.User.is(user)).toBeTruthy()
		expect(model.User.is(notUser)).toBeFalsy()
	})
})
