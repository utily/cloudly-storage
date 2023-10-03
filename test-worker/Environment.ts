export interface Environment
	extends Record<string, undefined | string | DurableObjectNamespace | KVNamespace | DurableObjectState | R2Bucket> {
	adminSecret?: string
	DatabaseBuffer?: DurableObjectNamespace
	databaseStore?: KVNamespace
	state?: DurableObjectState
	kvStore?: KVNamespace
	archive?: KVNamespace
	Do?: DurableObjectNamespace
	bucket?: R2Bucket
}
