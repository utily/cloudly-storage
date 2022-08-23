import { Document } from "./Document"

describe("Document tests", () => {
	it("is", () => {
		const document = {
			id: "cccc",
			name: "Faser",
			groups: [],
			level: 0,
			created: "2022-10-25T22:22:22.222Z",
			changed: "2022-08-22T11:04:48.715Z",
		}
		expect(Document.is(document)).toBeTruthy()
	})
})
