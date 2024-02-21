import { isoly } from "isoly"

export namespace Key {
	export function getLast(key: string): string {
		return key.split("/").splice(-1)[0]
	}
	export function getTime(key: string): isoly.DateTime | undefined {
		return key.split("/")?.find(e => isoly.DateTime.is(e))
	}
	export function getAt(key: string, position: number): string {
		return key.split("/").splice(position)[0]
	}
}
