import * as storage from "cloudly-storage"
import { Environment } from "../Environment"
import * as model from "../model"

type Layout = { archive: { users: model.User } }

export type Archive = storage.Database<Layout>

export namespace Archive {
	export function create(environment: Environment): Archive | undefined {
		return storage.Database.create<Layout>(
			{
				silos: { users: { type: "archive", idLength: 4 } },
			},
			environment.archive
		)
	}
}
