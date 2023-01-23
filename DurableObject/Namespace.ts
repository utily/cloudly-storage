import * as platform from "../platform"
import { Client } from "./Client"

export class Namespace {
	#objects: Record<string, Client | undefined> = {}
	private constructor(private readonly backend: platform.DurableObjectNamespace, readonly partitions = "") {}

	open(name?: string, id?: string, options?: platform.DurableObjectNamespaceNewUniqueIdOptions): Client {
		return typeof name == "string"
			? this.#objects[name] ??
					(this.#objects[name] = new Client(this.backend.get(this.backend.idFromName(this.partitions + name))))
			: typeof id == "string"
			? new Client(this.backend.get(this.backend.idFromString(id)))
			: new Client(this.backend.get(this.backend.newUniqueId(options)))
	}
	partition(...partition: string[]): Namespace {
		return new Namespace(this.backend, this.partitions + partition.join("/") + "/")
	}
	static open(backend: platform.DurableObjectNamespace | any): Namespace | undefined
	static open(backend: platform.DurableObjectNamespace | any, partition?: string): Namespace | undefined
	static open(backend: platform.DurableObjectNamespace | any, partition?: string): Namespace | undefined {
		return platform.DurableObjectNamespace.is(backend) ? new Namespace(backend, partition) : undefined
	}
}
