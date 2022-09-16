import { DurableObjectState, KVNamespace } from "../../../platform"

export interface Environment
	extends Record<string, undefined | boolean | (() => Promise<boolean>) | DurableObjectState | KVNamespace> {
	state: DurableObjectState
	archive?: KVNamespace
	setAlarm: () => Promise<boolean>
}
