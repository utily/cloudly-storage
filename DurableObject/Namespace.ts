import * as platform from "../platform"
import { Client } from "./Client"

export class Namespace {
	private constructor(private backend: platform.DurableObjectNamespace) {}
	open(name: string): Client {
		return new Client(this.backend.get(this.backend.idFromName(name)))
	}
	load(id: string): Client {
		return new Client(this.backend.get(this.backend.idFromString(id)))
	}
	static open(backend: platform.DurableObjectNamespace | any): Namespace | undefined {
		return platform.DurableObjectNamespace.is(backend) ? new Namespace(backend) : undefined
	}
}
