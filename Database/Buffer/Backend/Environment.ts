import { DurableObjectState } from "../../../platform"

export interface Environment extends Record<string, undefined | string | DurableObjectState> {
	state?: DurableObjectState
}
