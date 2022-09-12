import * as cryptly from "cryptly"
export type Identifier = string

export namespace Identifier {
	export function is(value: Identifier | any, length?: Length): value is Identifier {
		return (
			typeof value == "string" && /[A-Z,a-z,0-9,-,_]*/g.test(value) && (length == undefined || value.length == length)
		)
	}
	export type Length = cryptly.Identifier.Length
	export namespace Length {
		export const standard = 8
	}
	export function generate(length: Length = Length.standard) {
		return cryptly.Identifier.generate(length)
	}
}
