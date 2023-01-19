export type Continuable<T> = T[] & { cursor?: string }

export namespace Continuable {
	export function is<T = any>(
		value: Continuable<T> | any,
		isItem?: (item: T | any) => item is T
	): value is Continuable<T> {
		return (
			Array.isArray(value) &&
			(!isItem || value.every(isItem)) &&
			(!("cursor" in value) || typeof value.cursor == "string")
		)
	}
	export function hasCursor<T = any>(
		value: Continuable<T> | any,
		isItem?: (item: T | any) => item is T
	): value is Required<Continuable<T>> {
		return is(value, isItem) && "cursor" in value
	}
	export function create<T>(continuable: Continuable<T> | T[], cursor?: string): Continuable<T> {
		const result: Continuable<T> = [...continuable]
		if (!cursor && is(continuable))
			cursor = continuable.cursor
		if (cursor)
			result.cursor = cursor

		function modify<R>(output: R[]): Continuable<R> {
			const r = output as Continuable<R>
			if (cursor)
				r.cursor = cursor
			return r
		}
		const map = result.map
		result.map = <U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): Continuable<U> =>
			modify(map.bind(result)(callbackfn, thisArg))
		const filter = result.filter
		result.filter = <S extends T>(
			predicate: (value: T, index: number, array: T[]) => value is S,
			thisArg?: any
		): Continuable<S> => modify(filter.bind(result)(predicate, thisArg))
		const slice = result.slice
		result.slice = (start?: number, end?: number, thisArg?: any): Continuable<T> =>
			modify(slice.bind(result)(start, end, thisArg))
		const splice = result.splice
		result.splice = (start: number, deleteCount?: number, ...items: T[]): Continuable<T> =>
			modify(splice.bind(result)(start, deleteCount, ...items))
		const concat = result.concat
		result.concat = (...items: ConcatArray<T>[]): Continuable<T> => modify(concat.bind(result)(...items))

		return result
	}
}
