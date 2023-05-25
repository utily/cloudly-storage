import { Document } from "./Document"

export interface Item<M = any, V = any> {
	meta: M & Document
	value: V
}

export namespace Item {
	export function is(value: Item | any): value is Item {
		return (
			typeof value == "object" && (({ meta, value, ...rest }) => meta && value && Object.keys(rest).length == 0)(value)
		)
	}
	export function concat<I extends Item>(meta: I["meta"], value: I["value"]): I["meta"] & I["value"] {
		return { ...value, ...meta }
	}
	export function to<M extends Document, V extends Record<string, any>>(
		splitter?: (item: M & V) => Item<M, V>
	): (item: M & V) => Item<M, V> {
		return (item: M & V) => split(item, splitter)
	}
	export function toTuple<M extends Document, V extends Record<string, any>>(
		splitter?: (item: M & V) => Item<M, V>
	): (item: M & V) => [M & Document, V] {
		return (item: M & V) => {
			const { meta, value } = split(item, splitter)
			return [meta, value] as [M & Document, V]
		}
	}
	function split<M extends Document, V extends Record<string, any>>(
		item: M & V,
		splitter?: (i: M & V) => Item<M, V>
	): any {
		const { meta, value } = splitter ? splitter(item) : { value: item, meta: {} }
		const [document, rest] = Document.split<V & M>(value)
		return { meta: { ...document, ...meta }, value: rest } as Item<M, V>
	}
}
