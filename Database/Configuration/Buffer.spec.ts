import * as cryptly from "cryptly"
import { Buffer } from "./Buffer"

function createIds(): string[] {
	const mask = 255
	const result: string[] = []
	for (let seed = 0; seed < mask + 1; seed++)
		result.push(cryptly.Identifier.fromBinary(new Uint8Array([seed ?? 0])) + "AA")
	return result
}
describe("Buffer", () => {
	const configuration: Buffer = { shards: 4 }
	it("simple shard", () => {
		expect(Buffer.getShard(configuration, "AAAA")).toEqual("AA")
		expect(Buffer.getShard(configuration, "APAA")).toEqual("AA")
		expect(Buffer.getShard(configuration, "AQAA")).toEqual("AQ")
		expect(Buffer.getShard(configuration, "AgAA")).toEqual("Ag")
		expect(Buffer.getShard(configuration, "AhAA")).toEqual("Ag")
		expect(Buffer.getShard(configuration, "AwAA")).toEqual("Aw")
		expect(Buffer.getShard(configuration, "FFAA")).toEqual("AA")
		expect(Buffer.getShard(configuration, "GAAA")).toEqual("AA")
		expect(Buffer.getShard(configuration, "HAAA")).toEqual("AA")
		expect(Buffer.getShard(configuration, "IAAA")).toEqual("AA")
		expect(Buffer.getShard(configuration, "JAAA")).toEqual("AA")
		expect(Buffer.getShard(configuration, "KAAA")).toEqual("AA")
		expect(Buffer.getShard(configuration, "LAAA")).toEqual("AA")
		expect(Buffer.getShard(configuration, "MAAA")).toEqual("AA")
		expect(Buffer.getShard(configuration, "NAAA")).toEqual("AA")
		expect(Buffer.getShard(configuration, "OAAA")).toEqual("AA")
		expect(Buffer.getShard(configuration, "PAAA")).toEqual("AA")
		expect(Buffer.getShard(configuration, "EMMA")).toEqual("AA")
		expect(Buffer.getShard(configuration, "emma")).toEqual("Ag")
	})
	it("shard no id", () => {
		expect(Buffer.getShard(configuration)).toEqual(["AA", "AQ", "Ag", "Aw"])
	})
	it("shard id array", () => {
		const ids = createIds()
		const shardMap = Buffer.getShard(configuration, ids)
		expect(Object.values(shardMap).every(e => e.length == 64)).toBeTruthy()
	})
})
describe("Buffer", () => {
	const configuration: Buffer = { shards: 256 }
	it("shard id array", () => {
		const ids = createIds()
		const shardMap = Buffer.getShard(configuration, ids)
		expect(Object.values(shardMap).every(e => e.length == 1)).toBeTruthy()
	})
})
