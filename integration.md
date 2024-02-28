## Integration
- The cloudly-storage package needs to be added in the dependencies of the package.json file and needs to be installed.
- A Key Value store needs to be created on the cloudflare account used by the worker in order to use this database in the cloudflare worker.
- The durable object class Backend needs to be exported from the main ```index.ts``` file in your worker:
```ts
export { Backend } from "cloudly-storage"

export default {
	async fetch(
	...
```

### wrangler.toml
The wrangler.toml file needs to include a Key Value store and a durable object binding:
```
kv-namespaces = [
			{ binding = "archive", id = "id_found_in_the_cloudflare_dashboard", preview_id = "id_found_in_the_cloudflare_dashboard" }
		[
[durable_objects]
bindings = [
		{ name = "BufferBackend", class_name = "Backend" }
	   [
```
The binding in the kv-namespaces and the name of the durable_objects bindings can be whatever you want.

### Opening the DB
Lets say we want to open a transactional database that can store users with an interface User. A type Layout is required to configure the types of the database, in which you define what type of document you want to store, the name of the document type and the type of database you want. The type of the Layout can be found [here](Database/index.ts) as the type `Database`.
```ts
import { User } from "../model/User"
import { gracely } from "gracely"

type Layout = { collection: { user: User } }

export abstract class Storage {
	static #cloudlyDB: storage.Database<Layout>
	static get cloudlyDB(): storage.Database<Layout> {
		return (Storage.#cloudlyDB =
			Storage.#cloudlyDB ??
			storage.Database.create<Layout>(
				{
					silos: { user: { type: "collection", idLength: 8, retainChanged: true } },
				},
				Storage.environment.archive,
				Storage.environment.BufferBackend
			) ??
			gracely.server.misconfigured("databaseBuffer", "Missing environment variables to open database."))
	}
	static initialize(environment: Record<string, any>) {
		this.environment = environment
	}
}
```
Here the dependency `gracely` is used to generate errors. Note that the `Storage.environment.archive` & `Storage.environment.BufferBackend` needs to correspond to the bindings defined in wrangler.toml. The initialize function needs to be called with the environment by the worker before utilizing the database. The types for the configuration can be found in the [configuration folder](Database/Configuration).

Now an abstraction around the store function can be made to suit the use case, the following is just an example of how the database can be used.
```ts
import { Storage } from "./Storage"
import { User } from "../model/User"

export async function store(user: User, organization: string): Promise<User> {
	return await Storage.cloudlyDB.user.partition(organization).store(user)
}
```

## API
Once the database has been created following the example in the section `Integration` the following functions can be applied on the database. The Document type can be found in [`Database/Document.ts`](Database/Document.ts)

### store
Stores document(s) in the database.
```ts
store(document: User & Partial<Document>): Promise<(User & Document) | undefined>
store(documents: (User & Partial<Document>)[]): Promise<((User & Document) | undefined)[]>
```
### load
Loads document(s) from the database by either specifying the id, ids or a query in the form specified in the type [`Database/Selection/index.ts`](Database/Configuration/index.ts). A cursor can be returned if the query includes more documents than the specified limit or 1000 as default. The cursor can be used to continue the listing from where the previous one stopped.

```ts
load(id: Identifier): Promise<(T & Document) | undefined>
load(ids: Identifier[]): Promise<((Document & T) | undefined)[] & { cursor?: string }>
load(selection?: Selection): Promise<(Document & T)[] & { cursor?: string }>
```
### update
Updates a single document from the database by specifying its id and providing the updates in the body of the request. *The incoming updates will replace* the original content.

```ts
update(amendment: T & Partial<Document>): Promise<(T & Document) | undefined>
```
### append
Similar to the "update" function, append also updates a single document from the database by specifying its id and providing the updates in the body of the request. *The incoming updates will be appended* to the original content.

```ts
append(amendment: T & Partial<Document>): Promise<(T & Document) | undefined>
```
### remove
The remove function will delete the document and return a boolean representing the success of the operation.
```ts
remove(id: Identifier): Promise<boolean>
remove(id: Identifier[]): Promise<boolean[]>
```
### partition
The partition function can be used to create partitions, theoretically infinitely many partitions can be created but don't go crazy with it.
```ts
partition(...partition: Identifier[]): S 
```
