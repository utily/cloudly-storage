export class Item {
	private constructor(private readonly storage: DurableObjectStorage) {}

	async add(item: string): Promise<string> {
		await this.storage.put(item, item)
		return item
	}

	static open(storage: DurableObjectStorage): Item {
		return new Item(storage)
	}
}
