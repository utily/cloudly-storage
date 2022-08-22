import * as platform from "../platform"
import { Client } from "./Client"

export class Namespace {
	#objects: Record<string, Client | undefined> = {}
	private constructor(private readonly backend: platform.DurableObjectNamespace, readonly partitions = "") {}
	open(name: string): Client {
		console.log("this is the durable object name: ", this.partitions + name)
		return (
			this.#objects[name] ??
			(this.#objects[name] = new Client(this.backend.get(this.backend.idFromName(this.partitions + name))))
		)
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
