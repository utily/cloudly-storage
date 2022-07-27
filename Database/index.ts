import * as DurableObject from "../DurableObject"
import { KeyValueStore } from "../KeyValueStore"
import * as platform from "../platform"
import { Buffer } from "./Buffer"
import { Collection as DBCollection } from "./Collection"
import { Configuration as DBConfiguration } from "./Configuration"
import { Document as DBDocument } from "./Document"
import { Identifier as DBIdentifier } from "./Identifier"
import { Store } from "./Store"

export type Database<T extends Record<string, any>> = DatabaseImplementation<T> & { [C in keyof T]: DBCollection<T[C]> }

class DatabaseImplementation<T extends Record<string, any>> {
	constructor(
		private readonly configuration: Database.Configuration,
		private readonly buffer: Buffer,
		private readonly store: Store
	) {}
	partition<S extends T>(prefix: string): Database<S> {
		return DatabaseImplementation.create(
			this.configuration,
			this.buffer.partition(prefix),
			this.store.partition(prefix)
		)
	}
	static create<T extends Record<string, any>>(
		configuration: Database.Configuration,
		buffer: Buffer,
		store: Store
	): Database<T> {
		const result = new DatabaseImplementation(configuration, buffer, store)
		const collections: Record<string, Database.Collection<any> | undefined> = {}
		Object.entries(configuration).forEach(([name, configuration]) =>
			Object.defineProperty(result, name, {
				get: () =>
					collections[name] ?? (collections[name] = new Database.Collection(name, buffer, store, configuration)),
			})
		)
		return result as Database<T>
	}
}

export namespace Database {
	export function create<T extends Record<string, any>>(
		configuration: Configuration,
		buffer: platform.DurableObjectNamespace | undefined,
		store: platform.KVNamespace | undefined
	): Database<T> | undefined {
		const b = Buffer.open(DurableObject.Namespace.open(buffer))
		const s = Store.open(KeyValueStore.Json.create<Document & any>(store))
		return b && s && DatabaseImplementation.create<T>(configuration, b, s)
	}
	export type Collection<T> = DBCollection<T>
	export const Collection = DBCollection
	export type Configuration = DBConfiguration
	export const Configuration = DBConfiguration
	export type Identifier = DBIdentifier
	export const Identifier = DBIdentifier
	export type Document = DBDocument
}
