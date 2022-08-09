# Database
The technology used in this database are Durable Objects and Key Value stores, there exists a low level abstraction aroung these technologies in the DurableObject and KeyValueStore folders respectively.

The main feature is the Database, it contains Silos which are either Archives or Collections. Archives implement the Key Value Store abstraction and utimatly the cloudflare Key value store. 
- The Archive is able to store, load and remove documents, loading can be done using a prefix or an id of the document.
- The Collection utilizes a Durable Object abstraction called Buffer and an Archive for long term storage. The Buffer ensures consistency while writing and will write stale documents to the Archive. The buffer will contain several durable object to increase the number of simultaneous read and writes, these durable objects will use a key-shard, the id of the document will generate a specific shard.

The Database can be partitioned to store data in different layers, this will be useful to list documents for a particular partition. The key for the documents are comprised of `typeName/partition_1/partition_2/.../partition_n/dateTime/documentID` where n is a natural number. The Buffer will divide the data in different durable objects depending on `typeName/partition_1/partition_2/.../partition_n/shard`, and will use the same keys as the Archive to store the documents.
