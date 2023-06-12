import * as gracely from "gracely"
import { storage } from "cloudly-storage"
import { Context } from "./Context"

export class Items {
	private constructor(private readonly client: storage.DurableObject.Client) {}

	async create(item: string): Promise<string | gracely.Error> {
		const result = await this.client.post<string>("/item", item)
		return storage.Error.is(result)
			? gracely.server.unknown("Storage error: ", `message: ${result.message}, id: ${result.id}, name: ${result.name}`)
			: result
	}

	static open(namespace: storage.DurableObject.Namespace): Items {
		return new Items(namespace.open("items"))
	}
}

export namespace Items {
	export const Item = Context
}
