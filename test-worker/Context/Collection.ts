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
						reconcileAfter: { seconds: 10 },
						superimposeFor: { seconds: 15 },
						reconciliationInterval: { seconds: 10 },
						retention: { hours: 1 },
						partitions: {
							testtest: { retention: { minutes: 1 }, reconcileAfter: { seconds: 10 }, retainChanged: false },
						},
					},
				},
			},
			environment.archive,
			environment.DatabaseBuffer
		)
	}
}
