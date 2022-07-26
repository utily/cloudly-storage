import { DurableObjectId } from "./DurableObjectId"
import { DurableObjectStub } from "./DurableObjectStub"

export interface DurableObjectNamespace {
	newUniqueId: () => DurableObjectId
	idFromName: (name: string) => DurableObjectId
	idFromString: (hexId: string) => DurableObjectId
	get: (id: DurableObjectId) => DurableObjectStub
}
