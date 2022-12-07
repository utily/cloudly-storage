import { KVNamespaceListKey } from "./KVNamespaceListKey"

export type KVNamespaceListResult<Metadata, Key extends string = string> =
	| {
			list_complete: false
			keys: KVNamespaceListKey<Metadata, Key>[]
			cursor: string
	  }
	| {
			list_complete: true
			keys: KVNamespaceListKey<Metadata, Key>[]
	  }
