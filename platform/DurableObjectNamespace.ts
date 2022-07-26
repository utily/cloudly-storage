import { DurableObjectId } from "./DurableObjectId"
import { DurableObjectStub } from "./DurableObjectStub"

export interface DurableObjectNamespace {
	newUniqueId: () => DurableObjectId
	idFromName: (name: string) => DurableObjectId
	idFromString: (hexId: string) => DurableObjectId
	get: (id: DurableObjectId) => DurableObjectStub
}

export namespace DurableObjectNamespace {
	export function is(value: DurableObjectNamespace | any): value is DurableObjectNamespace {
		return (
			typeof value == "object" &&
			typeof value.newUniqueId == "function" &&
			typeof value.idFromName == "function" &&
			typeof value.idFromString == "function" &&
			typeof value.get == "function"
		)
	}
}
