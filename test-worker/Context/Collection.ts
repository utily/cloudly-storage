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
						meta: ["name", "groups"],
						type: "collection",
						idLength: 4,
						shards: 2,
						reconcileAfter: { minutes: 10 },
						superimposeFor: { minutes: 15 },
						reconciliationInterval: { minutes: 1 },
						retention: { hours: 1 },
						index: ["operation"],
						partitions: {
							testtest: { retention: { minutes: 30 }, reconcileAfter: { seconds: 10 } },
						},
					},
				},
			},
			environment.archive,
			environment.DatabaseBuffer
		)
	}
}
