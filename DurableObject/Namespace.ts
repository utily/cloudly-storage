import * as platform from "@cloudflare/workers-types"
import { Error } from "../Error"
import * as platformHelper from "../platform"
import { Client } from "./Client"

export class Namespace<E = Error> {
	#objects: Record<string, Client<E> | undefined> = {}
	private constructor(private readonly backend: platform.DurableObjectNamespace, readonly partitions = "") {}

	open(name?: string, id?: string, options?: platform.DurableObjectNamespaceNewUniqueIdOptions): Client<E> {
		return typeof name == "string"
			? this.#objects[name] ??
					(this.#objects[name] = new Client<E>(this.backend.get(this.backend.idFromName(this.partitions + name))))
			: typeof id == "string"
			? new Client<E>(this.backend.get(this.backend.idFromString(id)))
			: new Client<E>(this.backend.get(this.backend.newUniqueId(options)))
	}
	partition(...partition: string[]): Namespace<E> {
		return new Namespace<E>(this.backend, this.partitions + partition.join("/") + "/")
	}
	static open<E = Error>(backend: platform.DurableObjectNamespace | any): Namespace<E> | undefined
	static open<E = Error>(backend: platform.DurableObjectNamespace | any, partition?: string): Namespace<E> | undefined
	static open<E = Error>(backend: platform.DurableObjectNamespace | any, partition?: string): Namespace<E> | undefined {
		return platformHelper.DurableObjectNamespace.is(backend) ? new Namespace<E>(backend, partition) : undefined
	}
}
