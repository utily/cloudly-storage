import * as gracely from "gracely"
import * as storage from "cloudly-storage"
import { Environment } from "../Environment"
import * as model from "../model"

type CollectionTypes = {
	items: model.Item
}

export type Database = storage.Database<CollectionTypes>

export namespace Database {
	export function create(environment: Environment): Database | gracely.Error {
		return !environment.databaseBuffer
			? gracely.server.misconfigured("databaseBuffer", "Missing environment variable to open database.")
			: !environment.databaseStore
			? gracely.server.misconfigured("databaseStore", "Missing environment variable to open database.")
			: storage.Database.create<CollectionTypes>(
					{ items: { identifierLength: 4 } },
					environment.databaseBuffer,
					environment.databaseStore
			  ) ?? gracely.server.misconfigured("databaseBuffer", "Missing environment variable to open database.")
	}
}
