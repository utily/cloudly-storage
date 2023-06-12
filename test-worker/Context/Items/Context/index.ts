import * as gracely from "gracely"
import { Router } from "cloudly-router"
import { storage } from "cloudly-storage"
import { Environment } from "../../../Environment"
import { Item } from "./Item"

import "./item"

export class Context extends storage.DurableObject.Class {
	#item?: Item | gracely.Error
	get item(): Item | gracely.Error {
		return (this.#item ??= Item.open(this.state.storage))
	}

	router: Router<storage.DurableObject.Class> = Context.router
	constructor(private readonly state: DurableObjectState, public readonly environment: Environment) {
		super(state, environment)
	}
}
export namespace Context {
	export const router = new Router<Context>()
}
