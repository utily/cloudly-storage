import { Selection } from "./Selection"

describe("Selection", () => {
	it("simple", async () => {
		const selection: Selection = {
			created: { start: "2022-01-01", end: "2022-01-01" },
			cursor: "whateverthisis",
		}
		const locus: Selection.Locus | undefined = Selection.Locus.generate(selection)
		expect(locus).toEqual("created%24%242022-01-01%24%242022-01-01%24%24whateverthisis")
		expect(Selection.Locus.parse(locus ?? "")).toEqual(selection)
	})
	it("Without cursor", async () => {
		const selection: Selection = {
			created: { start: "2022-01-01", end: "2022-01-01" },
		}
		const locus: Selection.Locus | undefined = Selection.Locus.generate(selection)
		expect(locus).toEqual("created%24%242022-01-01%24%242022-01-01")
		expect(Selection.Locus.parse(locus ?? "")).toEqual(selection)
	})
})
