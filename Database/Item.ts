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
	export function split<M extends Document, V extends Record<string, any>>(
		splitter?: (item: M & V) => Item<M, V>
	): (item: M & V) => Item<M, V> {
		return (item: M & V) => {
			const [document, rest] = Document.split<V & M>(item)
			const { meta, value } = splitter ? splitter(rest) : { meta: document, value: rest }
			return { meta: { ...meta, ...document }, value } as Item<M, V>
		}
	}
	export function tuple<M extends Document, V extends Record<string, any>>(
		splitter?: (item: M & V) => Item<M, V>
	): (item: M & V) => [M & Document, V] {
		return (item: M & V) => {
			const [document, rest] = Document.split<V & M>(item)
			const { meta, value } = splitter ? splitter(rest) : { meta: document, value: rest }
			return [{ ...meta, ...document }, value] as [M & Document, V]
		}
	}
}
