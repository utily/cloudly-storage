# Database

## Overview
The technology used in this database are Durable Objects and Key Value stores, there exists a low level abstraction around these technologies in the DurableObject and KeyValueStore folders respectively.

The main feature is the Database, it contains Silos which are either Archives or Collections. Archives implement the Key Value Store abstraction and utimatly the cloudflare Key value store. 
- The Archive is able to store, load and remove documents, loading can be done using a date range or an id of the document.
- The Collection utilizes a Durable Object abstraction called Buffer and an Archive for long term storage. The Buffer ensures consistency and transactionality while writing. The buffer stored documents for a short timespan and writes documents to the Archive once deemed stale. The buffer will contain several durable objects to increase the number of simultaneous read and writes, these durable objects will use a key-shard, the id of the document will generate a corresponding shard.

The Database can be partitioned to store data in different layers, this will be useful to list documents for a particular partition. The key for the documents are comprised of `typeName/partition_1/partition_2/.../partition_n/dateTime/documentID` where n is a natural number. The Buffer will divide the data in different durable objects depending on `typeName/partition_1/partition_2/.../partition_n/shard`, and will use the same keys as the Archive to store the documents.

![f](https://user-images.githubusercontent.com/79835961/183652283-8623068b-e8e2-47ab-ad63-691375a9e26b.png)

_figure 1: The architecture of the database._

## Intregration
- The cloudly-storage package needs to be added in the dependencies of the package.json file and needs to be installed.
- A keyvalue store needs to be created on the cloudflare account used by the worker in order to use this database in the cloudflare worker.
- The durable object class Backend needs to be exported from the main ```index.ts``` file in your worker:
```ts
export { Backend } from "cloudly-storage"

export default {
	async fetch(
	...
```

### wrangler.toml
The wrangler.toml file needs to include a keyvalue store and a durable object binding:
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
Lets say we want to open a transactional database that can store users with an interface User.
```
import { User } from "../model/User"
import * as gracely from "gracely"

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
here I use the dependency `gracely` to generate errors. Note that the `Storage.environment.archive` & `Storage.environment.BufferBackend` needs to correspond to the bindings defined in wrangler.toml. The initialize function needs to be called with the environment by the worker before utilizing the database.

Now the database can be used by the worker as follows:
```
import { Storage } from "./Storage"
import { User } from "../model/User"

export async function store(user: User, organization: string): Promise<User> {
	return await Storage.cloudlyDB.user.partition(organization).store(user)
}
```

## API
Once the database has been created following the example in the section `Integration` the following functions can be applied on the database. The Document type can be found in `Database/Document.ts`

### store
Stores document(s) in the database.
```
store(document: User & Partial<Document>): Promise<(User & Document) | undefined>
store(documents: (User & Partial<Document>)[]): Promise<((User & Document) | undefined)[]>
```
### load
Loads document(s) form the database by either specifying the id, ids or a query in the form specified in the type `Database/Selection/index.ts`. A locus can be returned if the query includes more documents than the specified limit or 1000 as default. The locus can be used to continue the listing from where the previous one stopped.

```
load(id: Identifier): Promise<(T & Document) | undefined>
load(ids: Identifier[]): Promise<((Document & T) | undefined)[] & { locus?: string }>
load(selection?: Selection): Promise<(Document & T)[] & { locus?: string }>
```
### remove
The remove function will delete the document and return a boolean representing the success of the operation.
```
remove(id: Identifier): Promise<boolean>
remove(id: Identifier[]): Promise<boolean[]>
```
### partition
The partition function can be used to create partitions, theoretically infinitly many partitions can be created but don't go crazy with it.
```
partition(...partition: Identifier[]): S 
```
## Indecies
There exists 3 types of keys in the Database, `id`, `changed` and `doc`; each adds functionality to the database.
The definitions below are based on how they look in the `Archive`; the buffer uses a small variation of these keys where the type of the document as well as the slash following the type is omitted.

### doc
The doc-index contains the document the user wants to store/load/update.
The structure of the doc-key makes it possible, easy and fast to list ceratin a partition and query it on created time with a date range.

Definition:
```
key := type + "/doc/" + partitions.join("/") + "/" + document.created + "/" + document.id
{
	[key]: document
}
```
Where type is the name of the document used in the layout when initiating the database, the partitions are all of the partitions added to the initiated database, the document is the value the user wants to store.



### id
The purpose of the id-index is to make it possible to fetch a document while only knowing the type and id of the document.
Definition: 
```
{
	[type + "/id/" + document.id]: key
}
```
Where the type is the name of the document-type used in the layout when initiating the database and the document is the value the user wants to store and the key is defined above in `doc`.

### changed 
The changed-index is multi purposed and is used in the buffer to determine which documents to archive and which archived documents to remove. Its use in the archive is to be able query documents with a daterange representing the last time the document was changed.
Definition: 
```
{
	changed := truncate(document.changed, "minutes")
	[type + "/changed/" + changed]: `key_1\n
																	 key_2\n
																	 ...
																	 key_n`
}
```
Where the truncate function truncates the changed date of the document to minutes to save all keys of documents changed within that minute, the document is the value the user wants to store in the database, the key_n are on the form of key defined in `doc` and n is a natural number.
