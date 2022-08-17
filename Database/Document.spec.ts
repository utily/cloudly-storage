import { Document } from "./Document"

type TestType = Document & Record<string, any>

describe("merge tests", () => {
	const old = {
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
		const appended = Document.append<TestType>(old, age)
		expect(appended).toEqual({ ...old, age: 29 })
	})
	it("append array property", () => {
		const appended = Document.append<TestType>(old, hobbies)
		expect(appended).toEqual({ ...old, hobbies: [...old.hobbies, ...hobbies.hobbies] })
	})
	it("append object with different array", () => {
		const oldObj = {
			id: "xpto",
			name: { first: "Magnus", last: "Dunno" },
			age: 30,
			hobbies: ["fencing"],
			created: "",
			changed: "",
		}
		const newObj = {
			id: "xpto",
			name: { first: "Magnus", last: "Dunno" },
			age: 325,
			hobbies: ["coding", "singing"],
			created: "",
			changed: "",
		}
		const result = {
			id: "xpto",
			name: { first: "Magnus", last: "Dunno" },
			age: 325,
			hobbies: ["fencing", "coding", "singing"],
			created: "",
			changed: "",
		}

		const appended = Document.append<TestType>(oldObj, newObj)
		expect(appended).toEqual(result)
	})
	it("append object with mismatching object value", () => {
		const original = { id: "abcd", name: "baboba", created: "", changed: "" }
		const update = { name: undefined }
		const updated = Document.update(original, update)
		expect(updated && !("name" in updated)).toBeTruthy()
	})
})
