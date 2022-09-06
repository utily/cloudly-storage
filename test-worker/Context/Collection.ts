import * as storage from "cloudly-storage"
import { Environment } from "../Environment"
import * as model from "../model"

type Layout = { collection: { users: model.User } }

export type Collection = storage.Database<Layout>

export namespace Collection {
	export function create(environment: Environment): Collection | undefined {
		return storage.Database.create<Layout>(
			{
				silos: {
					users: {
						type: "collection",
						idLength: 4,
						retainChanged: true,
						shards: 1,
						secondsBetweenArchives: 10,
						secondsInBuffer: 12,
					},
				},
			},
			environment.archive,
			environment.DatabaseBuffer
		)
	}
}
