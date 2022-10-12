import { Selection } from "../../Selection"
import { Base } from "../Base"

export type Buffer = Base & {
	shard?: Record<string, string>
}

export namespace Buffer {
	export function parse(cursor?: string): Buffer | undefined {
		const parsed = Base.parse<Buffer>(cursor)
		const base = Base.to(parsed)
		return base ? { ...base, shard: parsed?.shard } : undefined
	}
	export function from(selection: Selection | any): Buffer | undefined {
		let result: Buffer | undefined
		const base = Base.from(selection)
		if (selection?.cursor)
			result = base?.shard ? base : undefined
		else
			result = base
		return result
	}
}
