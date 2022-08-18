import * as cryptly from "cryptly"
import { Query } from "./Query"

export type Locus = string
export namespace Locus {
	export function generate(query: Partial<Query>): Locus | undefined {
		return query && query.cursor ? cryptly.Base64.encode(JSON.stringify(query), "url") : undefined
	}
	export function parse(locus?: Locus | string): Query | undefined {
		return locus && JSON.parse(new cryptly.TextDecoder().decode(cryptly.Base64.decode(locus, "url")))
	}
}
