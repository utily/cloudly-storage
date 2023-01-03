import { Error } from "../Error"
import { Document } from "./Document"
import { Identifier } from "./Identifier"
import { Selection } from "./Selection"
export abstract class Silo<T = any, S extends Silo<T, S> = Silo<T, any>> {
	abstract load(id: Identifier): Promise<(T & Document) | undefined | Error>
	abstract load(ids: Identifier[]): Promise<((Document & T) | undefined)[] | Error | undefined>
	abstract load(selection?: Selection): Promise<((Document & T)[] & { cursor?: string }) | Error | undefined>

	abstract store(document: T & Partial<Document>): Promise<(T & Document) | Error | undefined>
	abstract store(documents: (T & Partial<Document>)[]): Promise<((T & Document) | undefined)[] | Error | undefined>

	abstract update(amendment: Partial<T & Document>): Promise<(T & Document) | Error | undefined>

	abstract append(amendment: Partial<T & Document>): Promise<(T & Document) | Error | undefined>

	abstract remove(id: Identifier): Promise<boolean | Error | undefined>
	abstract remove(id: Identifier[]): Promise<boolean[] | Error | undefined>
	// abstract remove(selection?: Selection): Promise<boolean> // to much rope?

	abstract partition(...partition: Identifier[]): S
}
