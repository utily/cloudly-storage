import { Document } from "./Document"
import { Identifier } from "./Identifier"
import { Selection } from "./Selection"

export abstract class Silo<T = any, S extends Silo<T, S> = Silo<T, any>> {
	abstract load(id: Identifier): Promise<(T & Document) | undefined>
	abstract load(ids: Identifier[]): Promise<((Document & T) | undefined)[]>
	abstract load(selection?: Selection): Promise<(Document & T)[] & { cursor?: string }>

	abstract store(document: T & Partial<Document>): Promise<(T & Document) | undefined>
	abstract store(documents: (T & Partial<Document>)[]): Promise<((T & Document) | undefined)[]>

<<<<<<< HEAD
	abstract update(amendment: Partial<T & Document>): Promise<(T & Document) | undefined>

	abstract append(amendment: Partial<T & Document>): Promise<(T & Document) | undefined>
=======
	abstract update(amendment: T & Partial<Document>): Promise<(T & Document) | undefined>

	abstract append(amendment: T & Partial<Document>): Promise<(T & Document) | undefined>
>>>>>>> 3b4a0d8... Added append document. (#37)

	abstract remove(id: Identifier): Promise<boolean>
	abstract remove(id: Identifier[]): Promise<boolean[]>
	// abstract remove(selection?: Selection): Promise<boolean> // to much rope?

	abstract partition(...partition: Identifier[]): S
}
