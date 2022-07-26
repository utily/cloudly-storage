import { DurableObjectId } from "./DurableObjectId"

export interface DurableObjectStub {
	name?: string
	id: DurableObjectId
	fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>
}
