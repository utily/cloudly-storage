import { Selection } from "./Selection"

describe("Selection", () => {
	it("simple", async () => {
		const selection: Selection = {
			created: { start: "2022-01-01", end: "2022-01-01" },
			cursor: "whateverthisis",
		}
		const locus: Selection.Locus | undefined = Selection.Locus.generate(selection)
		expect(locus).toEqual(
			"eyJjcmVhdGVkIjp7InN0YXJ0IjoiMjAyMi0wMS0wMSIsImVuZCI6IjIwMjItMDEtMDEifSwiY3Vyc29yIjoid2hhdGV2ZXJ0aGlzaXMifQ"
		)
		expect(Selection.Locus.parse(locus ?? "")).toEqual(selection)
	})
	it("Without cursor", async () => {
		const selection: Selection = {
			created: { start: "2022-01-01", end: "2022-01-01" },
		}
		const locus: Selection.Locus | undefined = Selection.Locus.generate(selection)
		expect(locus).toEqual("eyJjcmVhdGVkIjp7InN0YXJ0IjoiMjAyMi0wMS0wMSIsImVuZCI6IjIwMjItMDEtMDEifX0")
		expect(Selection.Locus.parse(locus ?? "")).toEqual(selection)
	})
})
