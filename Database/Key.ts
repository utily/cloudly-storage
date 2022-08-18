export namespace Key {
	export function getLast(key: string): string {
		return key.split("/").splice(-1)[0]
	}
	export function getAt(key: string, position: number): string {
		return key.split("/")[position]
	}
}
