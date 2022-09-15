import { DurableObjectState, KVNamespace } from "../../../platform"

export interface Environment
	extends Record<string, undefined | boolean | { set: () => boolean; is: boolean } | DurableObjectState | KVNamespace> {
	state: DurableObjectState
	archive?: KVNamespace
	alarm: { set: () => boolean; is: boolean }
}
