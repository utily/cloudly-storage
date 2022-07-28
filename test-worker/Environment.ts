export interface Environment
	extends Record<string, undefined | string | DurableObjectNamespace | KVNamespace | DurableObjectState> {
	adminSecret?: string
	databaseBuffer?: DurableObjectNamespace
	databaseStore?: KVNamespace
	state?: DurableObjectState
	kvStore?: KVNamespace
}
