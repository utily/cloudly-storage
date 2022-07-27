import * as platform from "../platform"
import { Client } from "./Client"

export class Namespace {
	#objects: Record<string, Client | undefined> = {}
	private constructor(private readonly backend: platform.DurableObjectNamespace, readonly prefix = "") {}
	open(name: string): Client {
		return (
			this.#objects[name] ??
			(this.#objects[name] = new Client(this.backend.get(this.backend.idFromName(this.prefix + name))))
		)
	}
	partition(prefix: string): Namespace {
		return new Namespace(this.backend, this.prefix + prefix)
	}
	static open(backend: platform.DurableObjectNamespace | any): Namespace | undefined {
		return platform.DurableObjectNamespace.is(backend) ? new Namespace(backend) : undefined
	}
}
