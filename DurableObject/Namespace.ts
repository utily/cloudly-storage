import * as platform from "@cloudflare/workers-types"
import { Error } from "../Error"
import * as platformHelper from "../platform"
import { Client } from "./Client"

export class Namespace<E = Error> {
	#objects: Record<string, Client<E> | undefined> = {}
	private constructor(private readonly backend: platform.DurableObjectNamespace, readonly partitions = "") {}

	open(name?: string, id?: string, options?: platform.DurableObjectNamespaceNewUniqueIdOptions): Client<E> {
		return typeof name == "string"
			? (this.#objects[name] ??= new Client<E>(this.backend.get(this.backend.idFromName(this.partitions + name))))
			: typeof id == "string"
			? new Client<E>(this.backend.get(this.backend.idFromString(id)))
			: new Client<E>(this.backend.get(this.backend.newUniqueId(options)))
	}
	fromName(name: string, options?: platform.DurableObjectNamespaceGetDurableObjectOptions): Client<E> {
		return (this.#objects[name] ??= new Client<E>(
			this.backend.get(this.backend.idFromName(this.partitions + name), options)
		))
	}
	fromId(
		id?: string,
		options?: platform.DurableObjectNamespaceNewUniqueIdOptions & platform.DurableObjectNamespaceGetDurableObjectOptions
	): Client<E> {
		return typeof id == "string"
			? new Client<E>(this.backend.get(this.backend.idFromString(id), options))
			: new Client<E>(this.backend.get(this.backend.newUniqueId(options), options))
	}
	partition(...partition: string[]): Namespace<E> {
		return new Namespace<E>(this.backend, this.partitions + partition.join("/") + "/")
	}
	static open<E = Error>(backend: platform.DurableObjectNamespace | any, partition?: string): Namespace<E> | undefined {
		return platformHelper.DurableObjectNamespace.is(backend) ? new Namespace<E>(backend, partition) : undefined
	}
	static is<E = Error>(value: any): value is Namespace<E> {
		return typeof value == "object" && typeof value.open == "function" && typeof value.partition == "function"
	}
}
