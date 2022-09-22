import { Archive as ConfigurationArchive } from "./Archive"
import { Buffer as ConfigurationBuffer } from "./Buffer"
import { Collection as ConfigurationCollection } from "./Collection"

export type Configuration = {
	silos: Record<
		string,
		(ConfigurationArchive & { type: "archive" }) | (ConfigurationCollection & { type: "collection" })
	>
}

export namespace Configuration {
	export type Archive = ConfigurationArchive
	export namespace Archive {
		export const standard = ConfigurationArchive.standard
		export type Complete = ConfigurationArchive.Complete
	}
	export type Buffer = ConfigurationBuffer
	export namespace Buffer {
		export const getShard = ConfigurationBuffer.getShard
		export const standard = ConfigurationBuffer.standard
		export type Complete = ConfigurationBuffer.Complete
	}

	export type Collection = ConfigurationCollection
	export namespace Collection {
		export const standard = ConfigurationCollection.standard
		export type Complete = ConfigurationCollection.Complete
	}
}
