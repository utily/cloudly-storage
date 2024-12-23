import { describe, expect, it } from "vitest"
import { storage } from "../index"

describe("Continuable", () => {
	const array = [1, 2, 3, 4, 5, 6, 7, 8, 9]
	it("is", async () => {
		const continuable = storage.Continuable.create(array, "abcd")
		expect(storage.Continuable.is(continuable)).toEqual(true)
		expect(storage.Continuable.is(array)).toEqual(true)
	})
	it("hasCursor", async () => {
		const continuable = storage.Continuable.create(array, "abcd")
		expect(storage.Continuable.hasCursor(continuable)).toEqual(true)
		expect(storage.Continuable.hasCursor(array)).toEqual(false)
	})
	it("map", async () => {
		const continuable = storage.Continuable.create(array, "abcd")
		const r = continuable.map(Math.sqrt)
		expect(storage.Continuable.is(r)).toEqual(true)
		expect(storage.Continuable.hasCursor(r)).toEqual(true)
		expect(r.toString()).toEqual(
			[
				1, 1.4142135623730951, 1.7320508075688772, 2, 2.23606797749979, 2.449489742783178, 2.6457513110645907,
				2.8284271247461903, 3,
			].toString()
		)
		expect((r as any).cursor).toEqual("abcd")
	})
	it("map + map", async () => {
		const continuable = storage.Continuable.create(array, "abcd")
		const r0 = continuable.map(Math.sqrt)
		expect(r0.toString()).toEqual(
			"1,1.4142135623730951,1.7320508075688772,2,2.23606797749979,2.449489742783178,2.6457513110645907,2.8284271247461903,3"
		)
		expect((r0 as any).cursor).toEqual("abcd")
		const r1 = r0.map(i => i * i)
		expect(r1.toString()).toEqual(
			"1,2.0000000000000004,2.9999999999999996,4,5.000000000000001,5.999999999999999,7.000000000000001,8.000000000000002,9"
		)
		expect((r1 as any).cursor).toEqual("abcd")
		const r2 = r1.map(i => i * i)
		expect(r2.toString()).toEqual(
			"1,4.000000000000002,8.999999999999998,16,25.00000000000001,35.99999999999999,49.000000000000014,64.00000000000003,81"
		)
		expect((r2 as any).cursor).toEqual("abcd")
	})
	it("flat map", async () => {
		const continuable = storage.Continuable.create(array, "abcd")
		const r = continuable.flatMap(Math.sqrt)
		expect(storage.Continuable.is(r)).toEqual(true)
		expect(storage.Continuable.hasCursor(r)).toEqual(true)
		expect(r.toString()).toEqual(
			[
				1, 1.4142135623730951, 1.7320508075688772, 2, 2.23606797749979, 2.449489742783178, 2.6457513110645907,
				2.8284271247461903, 3,
			].toString()
		)
		expect((r as any).cursor).toEqual("abcd")
	})
	it("filter", async () => {
		const continuable = storage.Continuable.create(array, "abcd")
		const r = continuable.filter(v => v % 2 == 0)
		expect(storage.Continuable.is(r)).toEqual(true)
		expect(storage.Continuable.hasCursor(r)).toEqual(true)
		expect(
			r.every(item => {
				return item % 2 == 0
			})
		).toEqual(true)
		expect(r.toString()).toEqual("2,4,6,8")
		expect((r as any).cursor).toEqual("abcd")
	})
	it("slice", async () => {
		const continuable = storage.Continuable.create(array, "abcd")
		const r = await continuable.slice(1, 4)
		expect(storage.Continuable.is(r)).toEqual(true)
		expect(storage.Continuable.hasCursor(r)).toEqual(true)
		expect(r.toString()).toEqual("2,3,4")
		expect((r as any).cursor).toEqual("abcd")
	})
	it("splice", async () => {
		const continuable = storage.Continuable.create(array, "abcd")
		const continuable2 = storage.Continuable.create(array, "abce")
		const continuable3 = storage.Continuable.create(array, "abcf")
		const continuable4 = storage.Continuable.create(array, "abcg")
		const r1 = continuable.splice(1)
		const r2 = continuable2.splice(1, 4)
		const r3 = continuable3.splice(1, 4, 1.2, 2.2)
		const r4 = continuable4.splice(0, continuable4.length)
		expect(storage.Continuable.is(r1)).toEqual(true)
		expect(storage.Continuable.hasCursor(r1)).toEqual(true)
		expect(storage.Continuable.is(r2)).toEqual(true)
		expect(storage.Continuable.hasCursor(r2)).toEqual(true)
		expect(storage.Continuable.is(r3)).toEqual(true)
		expect(storage.Continuable.hasCursor(r3)).toEqual(true)
		expect(storage.Continuable.is(r4)).toEqual(true)
		expect(storage.Continuable.hasCursor(r4)).toEqual(true)
		expect(r1.toString()).toEqual("")
		expect((r1 as any).cursor).toEqual("abcd")
		expect(continuable.toString()).toEqual("1,2,3,4,5,6,7,8,9")
		expect(r2.toString()).toEqual("2,3,4,5")
		expect((r2 as any).cursor).toEqual("abce")
		expect(continuable2.toString()).toEqual("1,6,7,8,9")
		expect(r3.toString()).toEqual("2,3,4,5")
		expect((r3 as any).cursor).toEqual("abcf")
		expect(continuable3.toString()).toEqual("1,1.2,2.2,6,7,8,9")
		expect(r4.toString()).toEqual("1,2,3,4,5,6,7,8,9")
		expect((r4 as any).cursor).toEqual("abcg")
		expect(continuable4.toString()).toEqual("")
	})
	it("concat", async () => {
		const continuable = storage.Continuable.create(array, "abcd")
		const continuable2 = storage.Continuable.create(array, "abce")
		const r = continuable.concat()
		const r2 = continuable.concat(1.1, 2.1, 3.1, 4.1)
		const r3 = continuable.concat(array)
		const r4 = continuable.concat(continuable2)
		const r5 = continuable.concat(array, continuable2, array)
		expect(storage.Continuable.is(r)).toEqual(true)
		expect(storage.Continuable.hasCursor(r)).toEqual(true)
		expect(storage.Continuable.is(r2)).toEqual(true)
		expect(storage.Continuable.hasCursor(r2)).toEqual(true)
		expect(storage.Continuable.is(r3)).toEqual(true)
		expect(storage.Continuable.hasCursor(r3)).toEqual(true)
		expect(storage.Continuable.is(r4)).toEqual(true)
		expect(storage.Continuable.hasCursor(r4)).toEqual(true)
		expect(storage.Continuable.is(r5)).toEqual(true)
		expect(storage.Continuable.hasCursor(r5)).toEqual(true)
		expect(r.toString()).toEqual("1,2,3,4,5,6,7,8,9")
		expect((r as any).cursor).toEqual("abcd")
		expect(r2.toString()).toEqual("1,2,3,4,5,6,7,8,9,1.1,2.1,3.1,4.1")
		expect((r2 as any).cursor).toEqual("abcd")
		expect(r3.toString()).toEqual("1,2,3,4,5,6,7,8,9,1,2,3,4,5,6,7,8,9")
		expect((r3 as any).cursor).toEqual("abcd")
		expect(r4.toString()).toEqual("1,2,3,4,5,6,7,8,9,1,2,3,4,5,6,7,8,9")
		expect((r4 as any).cursor).toEqual("abcd")
		expect(r5.toString()).toEqual("1,2,3,4,5,6,7,8,9,1,2,3,4,5,6,7,8,9,1,2,3,4,5,6,7,8,9,1,2,3,4,5,6,7,8,9")
		expect((r5 as any).cursor).toEqual("abcd")
	})
})
