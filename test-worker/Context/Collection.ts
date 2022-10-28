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
						shards: 2,
						reconcileAfter: { hours: 10 },
						superimposeFor: { hours: 15 },
						reconciliationInterval: { hours: 10 },
						retention: { hours: 1 },
						partitions: {
							testtest: { retention: { hours: 1 }, reconcileAfter: { seconds: 10 }, retainChanged: false },
							oneShard: { shards: 1 },
							twoShards: { shards: 2 },
							fourShards: { shards: 4 },
						},
					},
				},
			},
			environment.archive,
			environment.DatabaseBuffer
		)
	}
}
