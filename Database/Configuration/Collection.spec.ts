import { Collection } from "./Collection"

describe("Collection", () => {
	const configuration: Collection = { shards: 4 }
	it("simple shard", () => {
		expect(Collection.get(configuration, "AAAA")).toEqual("AA")
		expect(Collection.get(configuration, "AQAA")).toEqual("AQ")
		expect(Collection.get(configuration, "AgAA")).toEqual("Ag")
		expect(Collection.get(configuration, "AhAA")).toEqual("Ag")
		expect(Collection.get(configuration, "AwAA")).toEqual("Aw")
		expect(Collection.get(configuration, "FAAA")).toEqual("AA")
		expect(Collection.get(configuration, "GAAA")).toEqual("AA")
		expect(Collection.get(configuration, "HAAA")).toEqual("AA")
		expect(Collection.get(configuration, "IAAA")).toEqual("AA")
		expect(Collection.get(configuration, "JAAA")).toEqual("AA")
		expect(Collection.get(configuration, "KAAA")).toEqual("AA")
		expect(Collection.get(configuration, "LAAA")).toEqual("AA")
		expect(Collection.get(configuration, "MAAA")).toEqual("AA")
		expect(Collection.get(configuration, "NAAA")).toEqual("AA")
		expect(Collection.get(configuration, "OAAA")).toEqual("AA")
		expect(Collection.get(configuration, "PAAA")).toEqual("AA")
		expect(Collection.get(configuration, "QAAA")).toEqual("AA")
	})
	it("shard no id", () => {
		expect(Collection.get(configuration)).toEqual(["AA", "AQ", "Ag", "Aw"])
	})
	it("shard id array", () => {
		expect(Collection.get(configuration, ["AAAA", "AQAA", "AgAA", "AhAA", "AwAA"])).toEqual({
			AA: ["AAAA"],
			AQ: ["AQAA"],
			Ag: ["AgAA", "AhAA"],
			Aw: ["AwAA"],
		})
	})
})
