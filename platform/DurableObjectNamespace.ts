import * as platform from "@cloudflare/workers-types"

export namespace DurableObjectNamespace {
	export function is(value: platform.DurableObjectNamespace | any): value is platform.DurableObjectNamespace {
		return (
			typeof value == "object" &&
			typeof value.newUniqueId == "function" &&
			typeof value.idFromName == "function" &&
			typeof value.idFromString == "function" &&
			typeof value.get == "function"
		)
	}
}
