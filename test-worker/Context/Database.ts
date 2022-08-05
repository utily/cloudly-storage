import * as gracely from "gracely"
import * as storage from "cloudly-storage"
import { Environment } from "../Environment"
import * as model from "../model"

type Layout = { collection: { users: model.User } }

export type Database = storage.Database<Layout>

export namespace Database {
	export function create(environment: Environment): Database | gracely.Error {
		return (
			storage.Database.create<Layout>(
				{
					silos: { users: { type: "collection", idLength: 4, retainChanged: true } },
				},
				environment.kvStore,
				environment.DatabaseBuffer
			) ?? gracely.server.misconfigured("databaseBuffer", "Missing environment variable to open database.")
		)
	}
}
