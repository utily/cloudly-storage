import { Collection as ConfigurationCollection } from "./Collection"

export type Configuration = Record<string, ConfigurationCollection>

export namespace Configuration {
	export type Collection = ConfigurationCollection
	export const Collection = ConfigurationCollection
}
