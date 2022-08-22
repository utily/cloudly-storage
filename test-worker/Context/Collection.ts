import * as gracely from "gracely"
import * as storage from "cloudly-storage"
import { Environment } from "../Environment"
import * as model from "../model"

type Layout = { collection: { users: model.User } }

export type Collection = storage.Database<Layout>

export namespace Collection {
	export function create(environment: Environment): Collection | gracely.Error {
		return (
			storage.Database.create<Layout>(
				{
					silos: { users: { type: "collection", idLength: 4, retainChanged: true } },
				},
				environment.archive,
				environment.DatabaseBuffer
			) ?? gracely.server.misconfigured("databaseBuffer", "Missing environment variable to open database.")
		)
	}
}
