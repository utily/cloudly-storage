import * as DurableObject from "../../DurableObject"
// import { Configuration } from "../Configuration"

export class Buffer {
	private constructor(private readonly backend: DurableObject.Namespace) {}

	// put(name: string): Buffer {
	// 	this.backend.open(name).get()
	// }
	// get(name: string): Buffer {
	// 	const name = this.name + Configuration.Collection.get( this.configuration, id)
	// 	this.#buffers[name] = this.#buffers[name] ?? worker.DurableObject.Namespace.open(this.buffer)?.open(name)
	// 	return await this.#buffers[name].get("/get", { test: "test" })
	// 	this.backend.open(name)
	// }
	// list(name: string): Buffer {
	// 	this.backend.open(name)
	// }

	// load
	// store

	partition(prefix: string): Buffer {
		return this
	}

	static open(backend: DurableObject.Namespace | undefined): Buffer | undefined {
		return backend && new Buffer(backend)
	}
}
