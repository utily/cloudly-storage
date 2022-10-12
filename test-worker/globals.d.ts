declare global {
	function getMiniflareBindings(): import("./Environment").Environment
	function getMiniflareDurableObjectStorage(id: DurableObjectId): Promise<DurableObjectStorage>
}

export {}
