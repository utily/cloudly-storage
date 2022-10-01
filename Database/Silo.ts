import { Document } from "./Document"
import { Identifier } from "./Identifier"
import { Selection } from "./Selection"

export abstract class Silo<T = any, S extends Silo<T, S> = Silo<T, any>> {
	abstract load(id: Identifier): Promise<(T & Document) | undefined>
	abstract load(ids: Identifier[]): Promise<((Document & T) | undefined)[]>
	abstract load(selection?: Selection): Promise<(Document & T)[] & { cursor?: string }>

	abstract store(document: T & Partial<Document>): Promise<(T & Document) | undefined>
	abstract store(documents: (T & Partial<Document>)[]): Promise<((T & Document) | undefined)[]>

	abstract replace(document: T & Partial<Document>): Promise<(T & Document) | undefined>
	abstract replace(documents: (T & Partial<Document>)[]): Promise<((T & Document) | undefined)[]>

	abstract remove(id: Identifier): Promise<boolean>
	abstract remove(id: Identifier[]): Promise<boolean[]>
	// abstract remove(selection?: Selection): Promise<boolean> // to much rope?

	abstract partition(...partition: Identifier[]): S
}
