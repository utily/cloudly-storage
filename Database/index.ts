import * as platform from "@cloudflare/workers-types"
import { Namespace as DONamespace } from "../DurableObject"
import { KeyValueStore } from "../KeyValueStore"
import { Archive as DBArchive } from "./Archive"
import { Buffer as DBBuffer } from "./Buffer"
import { Collection as DBCollection } from "./Collection"
import { Configuration as DBConfiguration } from "./Configuration"
import { Document as DBDocument } from "./Document"
import { Identifier as DBIdentifier } from "./Identifier"
import { Silo as DBSilo } from "./Silo"

export { Selection } from "./Selection"
export { Backend } from "./Buffer"

export type Database<T extends { archive?: Record<string, any>; collection?: Record<string, any> }> =
	DatabaseImplementation<T> &
		{ [A in keyof T["archive"]]: DBArchive<T["archive"][A]> } &
		{ [C in keyof T["collection"]]: DBCollection<T["collection"][C]> }

class DatabaseImplementation<T extends Record<string, any>> {
	constructor(private readonly configuration: Required<Database.Configuration>) {}
	partition<S extends T = T>(...partition: string[]): Database<S> {
		const result = new DatabaseImplementation(this.configuration)
		const silos: Record<string, Database.Silo | undefined> = {}
		Object.entries(this.configuration.silos).forEach(([name, c]) =>
			Object.defineProperty(result, name, {
				get: () =>
					silos[name] ??
					(silos[name] = ((this as any as Database<T>)[name] as any as Database.Silo).partition(...partition)),
			})
		)
		return result as Database<S>
	}

	static create<T extends { archive?: Record<string, any> | undefined; collection?: Record<string, any> | undefined }>(
		configuration: Required<Database.Configuration>,
		archive: KeyValueStore<string>,
		buffer?: DONamespace
	): Database<T> {
		const result = new DatabaseImplementation(configuration)
		const silos: Record<string, Database.Silo | undefined> = {}
		Object.entries(configuration.silos).forEach(([name, c]) =>
			Object.defineProperty(result, name, {
				get: () =>
					silos[name] ??
					(silos[name] =
						c.type == "archive"
							? DBArchive.open(KeyValueStore.partition(archive, name + "/"), c)
							: c.type == "collection"
							? DBCollection.open(
									DBArchive.open(KeyValueStore.partition(archive, name + "/"), c),
									DBBuffer.open(buffer?.partition(name), c),
									c
							  )
							: undefined),
			})
		)
		return result as Database<T>
	}
}

export namespace Database {
	export function create<T extends Record<string, any>>(
		configuration: Configuration,
		archive?: platform.KVNamespace | undefined,
		buffer?: platform.DurableObjectNamespace
	): Database<T> | undefined {
		const kv = KeyValueStore.open(archive, "text")
		return kv && DatabaseImplementation.create<T>(configuration, kv, DONamespace.open(buffer))
	}
	export type Archive<T = any> = DBArchive<T> // no export of functions
	export type Collection<T = any> = DBCollection<T> // no export of functions
	export type Silo<T = any> = DBSilo<T> // no export of functions
	export type Configuration = DBConfiguration
	export const Configuration = DBConfiguration
	export type Identifier = DBIdentifier
	export const Identifier = DBIdentifier
	export type Document = DBDocument
}
