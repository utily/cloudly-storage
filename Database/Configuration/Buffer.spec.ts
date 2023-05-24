import { Buffer } from "./Buffer"

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
		expect(Buffer.getShard({ shards: 8 })).toEqual(["AA", "AQ", "Ag", "Aw", "BA", "BQ", "Bg", "Bw"])
	})
	it("shard id array", () => {
		expect(Buffer.getShard(configuration, ["AAAA", "AQAA", "AgAA", "AhAA", "AwAA"])).toEqual({
			AA: ["AAAA"],
			AQ: ["AQAA"],
			Ag: ["AgAA", "AhAA"],
			Aw: ["AwAA"],
		})
	})
	it("testing the test", () => {
		const config: Buffer = { shards: 2 }
		console.log(
			Buffer.getShard(config, [
				"t98-mx0N7HNPqNiQ",
				"v74arzL-8KOWmLKn",
				"c95sSp4Nr5YhQ6ot",
				"81noiBwdkY2VNHOF",
				"M9ZVAstApwzloNaj",
				"GW1-sgXqXEkFhLXo",
				"v8taq1E4Vfx_V5ZY",
				"MQQlz76xaznEi5fw",
				"T-L7Q0LvMOLpl3cp",
				"8YvC5aIZHqws-yIC",
				"v-1p4Xd8s63u8sDF",
				"s66Ch8mYPPcZFRIQ",
				"vR4uxPti84IPM1q1",
				"JQl7uyrLWqG-fNV0",
			])
		)
		expect(
			JSON.stringify(
				Buffer.getShard(config, [
					"5XqWbwIfhL-CroH4",
					"ftyN9ZXEqzEy_OuX",
					"6d56YJKXqTBUErHS",
					"MUi2fELkUlJAW0wr",
					"TIUWwXAidkWVy7Yh",
					"98D8Fg0CvXavafZ3",
					"7AMxmq6vpH-hpeAA",
					"Swvmwx1SyVaYb7RF",
					"fr827G32yCYgs8Mi",
					"hsxnGa9OyFDh_t4H",
					"0wvLLopWJ7c-cVC6",
					"5RQQNgutlXmCF6mo",
					"7IUAbG-VmoTvJAqX",
					"fpkrhxZjsTA45iKD",
					"OsM1ib96c6-40wv2",
					"yrWa3wi-fJcKbTur",
					"GP_3OboO9B9939WU",
					"uyGXnTKV3G9uImVa",
					"2W-jd5LLR5lFx_sE",
					"M_Y35hAlnmmFcpQM",
					"LW0IUbHTbFxscb4K",
					"o0MXMJ5cLzKbtd_O",
					"FNLITuEMV9NGiCse",
					"-2inAbaem1jmp9z7",
					"rpMbDjSxXRIGtRTH",
					"CjpvwenFIuFV5huU",
					"S3B_vxUPK1j7ZvT3",
					"Klc87Bov-85zKT1w",
					"dxAJZVGHSo6M29Ia",
				])
			)
		).toEqual(
			'{"AQ":["5XqWbwIfhL-CroH4","6d56YJKXqTBUErHS","MUi2fELkUlJAW0wr","98D8Fg0CvXavafZ3","Swvmwx1SyVaYb7RF","0wvLLopWJ7c-cVC6","5RQQNgutlXmCF6mo","uyGXnTKV3G9uImVa","2W-jd5LLR5lFx_sE","M_Y35hAlnmmFcpQM","LW0IUbHTbFxscb4K","o0MXMJ5cLzKbtd_O","-2inAbaem1jmp9z7","S3B_vxUPK1j7ZvT3","dxAJZVGHSo6M29Ia"],"AA":["ftyN9ZXEqzEy_OuX","TIUWwXAidkWVy7Yh","7AMxmq6vpH-hpeAA","fr827G32yCYgs8Mi","hsxnGa9OyFDh_t4H","7IUAbG-VmoTvJAqX","fpkrhxZjsTA45iKD","OsM1ib96c6-40wv2","yrWa3wi-fJcKbTur","GP_3OboO9B9939WU","FNLITuEMV9NGiCse","rpMbDjSxXRIGtRTH","CjpvwenFIuFV5huU","Klc87Bov-85zKT1w"]}'
		)
	})
})
