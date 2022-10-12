import { Archive } from "./Archive"
import { Base } from "./Base"
import { Buffer } from "./Buffer"

export type Collection = Archive & Buffer

export namespace Collection {
	export function create(archive?: string, buffer?: Buffer, limit?: number): string | undefined {
		const archiveCursor = Archive.parse(archive)
		limit = limit ?? archiveCursor?.limit ?? buffer?.limit
		return archiveCursor?.cursor && buffer?.shard
			? Base.serialize<Collection>({ ...buffer, ...archiveCursor, limit })
			: !archiveCursor?.cursor && buffer?.shard
			? Base.serialize<Collection>({ ...buffer, limit })
			: archiveCursor?.cursor && !buffer?.shard
			? Base.serialize<Collection>({ ...archiveCursor, limit })
			: undefined
	}
}
