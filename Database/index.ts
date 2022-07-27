import { Buffer } from "./Buffer"
import { Collection as DBCollection } from "./Collection"
import { Configuration as DBConfiguration } from "./Configuration"
import { Document as DBDocument } from "./Document"
import { Identifier as DBIdentifier } from "./Identifier"
import { Storage } from "./Storage"

export type Database<T extends Record<string, any>> = DatabaseImplementation<T> & { [C in keyof T]: DBCollection<T[C]> }

class DatabaseImplementation<T extends Record<string, any>> {
	constructor(
		private readonly configuration: DBConfiguration,
		private readonly buffer: Buffer,
		private readonly storage: Storage
	) {}
	partition<S extends T>(prefix: string): Database<S> {
		return Database.create(this.configuration, this.buffer.partition(prefix), this.storage.partition(prefix))
	}
}

export namespace Database {
	export function create<T extends Record<string, any>>(
		configuration: Configuration,
		buffer: Buffer,
		storage: Storage
	): Database<T> {
		const result = new DatabaseImplementation(configuration, buffer, storage)
		const collections: Record<string, Collection<any> | undefined> = {}
		Object.entries(configuration).forEach(([name, configuration]) =>
			Object.defineProperty(result, name, {
				get: () => collections[name] ?? (collections[name] = new Collection(name, buffer, storage, configuration)),
			})
		)
		return result as Database<T>
	}
	export type Collection<T> = DBCollection<T>
	export const Collection = DBCollection
	export type Configuration = DBConfiguration
	export const Configuration = DBConfiguration
	export type Identifier = DBIdentifier
	export const Identifier = DBIdentifier
	export type Document = DBDocument
}
