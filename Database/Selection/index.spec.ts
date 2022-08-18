import { Selection } from "."

describe("Selection", () => {
	it("simple", async () => {
		const query: Selection.Query = {
			created: { start: "2022-01-01", end: "2022-01-01" },
			cursor: "whatEverThisIs",
		}
		const locus: Selection.Locus | undefined = Selection.Locus.generate(query)
		expect(locus).toEqual(
			"eyJjcmVhdGVkIjp7InN0YXJ0IjoiMjAyMi0wMS0wMSIsImVuZCI6IjIwMjItMDEtMDEifSwiY3Vyc29yIjoid2hhdEV2ZXJUaGlzSXMifQ"
		)
		expect(Selection.Locus.parse(locus ?? "")).toEqual(query)
	})
	it("Without cursor", async () => {
		const query: Selection = {
			created: { start: "2022-01-01", end: "2022-01-01" },
		}
		const locus: Selection.Locus | undefined = Selection.Locus.generate(query)
		expect(locus).toEqual(undefined)
	})
})
