import * as platform from "@cloudflare/workers-types"

export interface Environment
	extends Record<
		string,
		undefined | boolean | (() => Promise<boolean>) | platform.DurableObjectState | platform.KVNamespace
	> {
	state: platform.DurableObjectState
	archive?: platform.KVNamespace
	setAlarm: () => Promise<boolean>
}
