import { KeyValueStore } from "../KeyValueStore"

export class Store {
	partition(prefix: string): Store {
		return this
	}
	static open(backend: KeyValueStore | undefined): Store | undefined {
		return backend && new Store()
	}
}
