import { Archive as ArchiveCursor } from "./Archive"
import { Buffer as BufferCursor } from "./Buffer"
import { Shard as ShardType } from "./Buffer/Shard"
import { Collection as CollectionCursor } from "./Collection"

export type Cursor = ArchiveCursor & BufferCursor

export namespace Cursor {
	export type Archive = ArchiveCursor
	export namespace Archive {
		export const from = ArchiveCursor.from
		export const serialize = ArchiveCursor.serialize
		export const parse = ArchiveCursor.parse
		export const prefix = ArchiveCursor.prefix
	}
	export type Collection = CollectionCursor
	export namespace Collection {
		export const create = CollectionCursor.create
	}
	export type Buffer = BufferCursor
	export namespace Buffer {
		export const from = BufferCursor.from
		export const parse = BufferCursor.parse
	}
	export type Shard = ShardType
	export namespace Shard {
		export const from = ShardType.from
		export const prefix = ShardType.prefix
	}
}
