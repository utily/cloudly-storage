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
	it("append object with mismatching object value", () => {
		const original = { id: "abcd", name: "baboba", created: "", changed: "" }
		const update = { name: undefined }
		const updated = Document.update(original, update)
		expect(updated && !("name" in updated)).toBeTruthy()
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
	it("Deep update", () => {
		const oldObj = {
			id: "xpto",
			name: { firstName: "Thiago", surname: { middleName: "Hlebanja", lastName: "Oliva" } },
			age: 30,
			hobbies: ["fencing"],
			created: "",
			changed: "",
		}
		const newObj = {
			id: "xpto",
			name: { firstName: "Thiago", surname: { middleName: "Hlebanja", lastName: "Octaviosson" } },
			age: 325,
			hobbies: ["coding", "singing"],
			created: "",
			changed: "",
		}

		// oldObj.name.surname.middleName = "Tavares"

		const expectedObj = {
			id: "xpto",
			name: { firstName: "Thiago", surname: { middleName: "Hlebanja", lastName: "Octaviosson" } },
			age: 325,
			hobbies: ["fencing", "coding", "singing"],
			created: "",
			changed: "",
		}

		const appended = Document.append<TestType>(oldObj, newObj)
		console.log(appended)

		expect(appended).toEqual(expectedObj)
	})
	it("Add deep new object", () => {
		const oldObj = {
			level: 0,
			id: "bubu",
			groups: [],
			name: "James",
			created: "2022-08-01T15:50:03.649Z",
			changed: "2022-08-01T15:50:03.649Z",
			address: {
				street: "Torsgatan",
				zip: 7777,
				region: {
					city: "Gothenburg",
					country: "Sweden",
				},
			},
		}
		const newObj = {
			level: 0,
			id: "bubu",
			groups: ["group1"],
			name: "James",
			created: "2022-08-01T15:50:03.649Z",
			changed: "2022-08-01T15:50:03.649Z",
			address: {
				street: "Torsgatan",
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
				street: "Torsgatan",
				zip: 7777,
				region: {
					city: "Uppsala",
					country: "Sweden",
					county: "Uppland",
				},
			},
		}
		const appended = Document.append<TestType>(oldObj, newObj)
		console.log(appended)
		console.log(appended && appended["address"]["region"]["county"])
		console.log(appended && appended["address"]["region"].county)
		console.log(appended && appended.county)
		expect(appended).toEqual(expectedObj)
	})
	it("append object with mismatching object value", () => {
		const original = { id: "abcd", name: "baboba", created: "", changed: "" }
		const update = { name: undefined }
		const updated = Document.update(original, update)
		expect(updated && !("name" in updated)).toBeTruthy()
	})
})
