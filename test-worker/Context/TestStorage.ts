import { Archive } from "./Archive"
import { Collection } from "./Collection"

export abstract class TestStorage {
	private static environment = getMiniflareBindings()

	static #collection?: Collection | undefined
	static get collection(): Collection | undefined {
		return this.#collection ?? (this.#collection = Collection.create(TestStorage.environment))
	}
	static #archive?: Archive | undefined
	static get archive(): Archive | undefined {
		return this.#archive ?? (this.#archive = Archive.create(TestStorage.environment))
	}
}
