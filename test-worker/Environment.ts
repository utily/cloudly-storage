export interface Environment
	extends Record<string, undefined | string | DurableObjectNamespace | KVNamespace | DurableObjectState> {
	adminSecret?: string
	DatabaseBuffer?: DurableObjectNamespace
	databaseStore?: KVNamespace
	state?: DurableObjectState
	kvStore?: KVNamespace
	archive?: KVNamespace
	Do?: DurableObjectNamespace
}
