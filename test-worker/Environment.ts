export interface Environment extends Record<string, undefined | string | DurableObjectNamespace | KVNamespace> {
	adminSecret?: string
	databaseBuffer?: DurableObjectNamespace
	databaseStore?: KVNamespace
}
