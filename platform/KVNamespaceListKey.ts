export interface KVNamespaceListKey<Metadata, Key extends string = string> {
	name: Key
	expiration?: number
	metadata?: Metadata
}
