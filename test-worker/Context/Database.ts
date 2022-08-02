import * as gracely from "gracely"
import * as storage from "cloudly-storage"
import { Environment } from "../Environment"
import * as model from "../model"

type SiloTypes = {
	archive: {
		users: model.User
	}
}

export type Database = storage.Database<SiloTypes>

export namespace Database {
	export function create(environment: Environment): Database | gracely.Error {
		return !environment.databaseStore
			? gracely.server.misconfigured("databaseStore", "Missing environment variable to open database.")
			: storage.Database.create<SiloTypes>(
					{ silos: { users: { type: "archive", idLength: 4 } } }
					// environment.databaseBuffer,
					// environment.databaseStore
			  ) ?? gracely.server.misconfigured("databaseBuffer", "Missing environment variable to open database.")
	}
}
