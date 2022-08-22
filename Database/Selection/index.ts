import { Locus as SLocus } from "./Locus"
import { Query as SQuery } from "./Query"

export type Selection = SQuery | { locus?: SLocus } | undefined
export namespace Selection {
	export function get(selection: Selection): Query | undefined {
		return selection && !("locus" in selection) ? (selection as Query) : Locus.parse(selection?.locus)
	}
	export type Query = SQuery
	export namespace Query {
		export const extractPrefix = SQuery.extractPrefix
	}

	export type Locus = SLocus
	export namespace Locus {
		export const generate = SLocus.generate
		export const parse = SLocus.parse
	}
}
