import { Archive as ConfigurationArchive } from "./Archive"
import { Buffer as ConfigurationBuffer } from "./Buffer"
import { Collection as ConfigurationCollection } from "./Collection"

export type Configuration = Partial<Configuration.Collection> & {
	silos: Record<
		string,
		(ConfigurationArchive & { type: "archive" }) | (ConfigurationCollection & { type: "collection" })
	>
}

export namespace Configuration {
	export type Archive = ConfigurationArchive
	export const Archive = ConfigurationArchive
	export type Buffer = ConfigurationBuffer
	export const Buffer = ConfigurationBuffer
	export type Collection = ConfigurationCollection
	export const Collection = ConfigurationCollection
}
