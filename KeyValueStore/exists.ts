import * as platform from "../platform"
import { InMemory } from "./InMemory"

export function exists(namespace?: string | platform.KVNamespace): boolean {
	return typeof namespace != "object" && InMemory.exists(namespace)
}
