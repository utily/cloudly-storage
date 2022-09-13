import { DurableObjectState, KVNamespace } from "../../../platform"

export interface Environment extends Record<string, undefined | string | DurableObjectState | KVNamespace> {
	state?: DurableObjectState
	archive?: KVNamespace
	changedPrecision?: "seconds" | "minutes" | "hours"
}
