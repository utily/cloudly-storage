import * as platform from "@cloudflare/workers-types"
import { InMemory } from "./InMemory"

export function exists(namespace?: string | platform.KVNamespace): boolean {
	return typeof namespace != "object" && InMemory.exists(namespace)
}
