import { Document } from "./Document"

type TestType = Document & Record<string, any>

describe("merge tests", () => {
	const original = {
		id: "abcd",
		name: { first: "Thiago", last: "Hej" },
		age: 31,
		hobbies: ["coding", "singing"],
		created: "",
		changed: "",
	}
	const age = {
		age: 29,
	}
	const hobbies = {
		hobbies: ["prancing"],
	}
	it("append number property", () => {
		const appended = Document.append<TestType>(original, age)
		expect(appended).toEqual({ ...original, age: 29 })
	})
	it("append object with mismatching object value", () => {
		const original = { id: "abcd", name: "baboba", created: "", changed: "" }
		const update = { name: undefined }
		const updated = Document.update(original, update)
		expect(updated && !("name" in updated)).toBeTruthy()
	})
	it("append array property", () => {
		const appended = Document.append<TestType>(original, hobbies)
		expect(appended).toEqual({ ...original, hobbies: [...original.hobbies, ...hobbies.hobbies] })
	})
	it("append object with different array", () => {
		const original = {
			id: "xpto",
			name: { first: "TestName", last: "TestLast" },
			age: 30,
			hobbies: ["fencing"],
			created: "",
			changed: "",
		}
		const amendment = {
			id: "xpto",
			name: { first: "TestName", last: "TestLast" },
			age: 325,
			hobbies: ["coding", "singing"],
			created: "",
			changed: "",
		}
		const result = {
			id: "xpto",
			name: { first: "TestName", last: "TestLast" },
			age: 325,
			hobbies: ["fencing", "coding", "singing"],
			created: "",
			changed: "",
		}

		const appended = Document.append<TestType>(original, amendment)
		expect(appended).toEqual(result)
	})
	it("Deep update", () => {
		const original = {
			id: "xpto",
			name: { firstName: "TestName", surname: { middleName: "TestMiddle", lastName: "TestLast" } },
			age: 30,
			hobbies: ["fencing"],
			created: "",
			changed: "",
		}
		const amendment = {
			id: "xpto",
			name: { firstName: "TestName", surname: { middleName: "TestMiddle", lastName: "TestLast" } },
			age: 325,
			hobbies: ["coding", "singing"],
			created: "",
			changed: "",
		}

		const expectedObj = {
			id: "xpto",
			name: { firstName: "TestName", surname: { middleName: "TestMiddle", lastName: "TestLast" } },
			age: 325,
			hobbies: ["fencing", "coding", "singing"],
			created: "",
			changed: "",
		}

		expect(Document.append<TestType>(original, amendment)).toEqual(expectedObj)
	})
	it("Add deep new object", () => {
		const original = {
			level: 0,
			id: "bubu",
			groups: [],
			name: "James",
			created: "2022-08-01T15:50:03.649Z",
			changed: "2022-08-01T15:50:03.649Z",
			address: {
				street: "ElizabethRoad",
				zip: 7777,
				region: {
					city: "Lund",
					country: "Sweden",
				},
			},
		}
		const amendment = {
			level: 0,
			id: "bubu",
			groups: ["group1"],
			name: "James",
			created: "2022-08-01T15:50:03.649Z",
			changed: "2022-08-01T15:50:03.649Z",
			address: {
				street: "ElizabethRoad",
				zip: 7777,
				region: {
					city: "Uppsala",
					country: "Sweden",
					county: "Uppland",
				},
			},
		}
		const expectedObj = {
			level: 0,
			id: "bubu",
			groups: ["group1"],
			name: "James",
			created: "2022-08-01T15:50:03.649Z",
			changed: "2022-08-01T15:50:03.649Z",
			address: {
				street: "ElizabethRoad",
				zip: 7777,
				region: {
					city: "Uppsala",
					country: "Sweden",
					county: "Uppland",
				},
			},
		}
		const appended = Document.append<TestType>(original, amendment)
		expect(appended).toEqual(expectedObj)
	})
	it("append object with mismatching object value", () => {
		const original = { id: "abcd", name: "baboba", created: "", changed: "" }
		const update = { name: undefined }
		const updated = Document.update(original, update)
		expect(updated && !("name" in updated)).toBeTruthy()
	})
})
