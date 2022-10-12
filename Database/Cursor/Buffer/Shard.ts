import * as isoly from "isoly"
import { Key } from "../../Key"
import { Selection } from "../../Selection"
import { Base } from "../Base"
import { Buffer } from "./index"

export type Shard = Partial<Base> & {
	key?: string
}
export namespace Shard {
	export function from(shard: string, shards: number, cursor?: Buffer): Shard {
		const lastKey = cursor?.shard?.[shard]
		return {
			type: cursor?.type ?? "doc",
			limit: Math.ceil((cursor?.limit ?? Selection.standardLimit) / shards),
			end: cursor?.end,
			key: lastKey,
			start: lastKey ? Key.getTime(lastKey) : cursor?.start,
		}
	}
	export function prefix(
		cursor: Shard | undefined,
		documentType: string | string[] | undefined,
		partitions: string | undefined
	): string[] {
		const result: string[] = []
		let start = cursor?.start && isoly.DateTime.getDate(cursor?.start)
		const end = cursor?.end && isoly.DateTime.getDate(cursor?.end)
		const prefix = (documentType ?? "") + "/doc/" + (partitions ?? "")
		while (start && end && start <= end) {
			result.push(prefix + start)
			start = isoly.Date.next(start)
		}
		return result.length == 0 ? [prefix] : result
	}
}
