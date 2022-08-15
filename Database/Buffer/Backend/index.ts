import * as isoly from "isoly"
import "./load"
import "./store"
import { DurableObjectState } from "../../../platform"
import { Database } from "../../index"
import { Context } from "./Context"
import { Environment } from "./Environment"

type Layout = { archive: { users: any } }
export class Backend {
	private constructor(private readonly state: DurableObjectState, private environment: Environment) {}

	async fetch(request: Request): Promise<Response> {
		await this.state.storage.setAlarm(Date.now() + 5 * 1000, {})
		return await Context.handle(request, { ...(this.environment ?? {}), state: this.state })
	}

	async alarm(): Promise<void> {
		const staleRetainer = 10 * 1000 // Should be set by some config
		const staleTime = isoly.DateTime.create(Date.now() - staleRetainer, "milliseconds")
		const changedList = Object.fromEntries((await this.state.storage.list<string>({ prefix: "changed" })).entries())
		const keyToBeStored = Object.entries(changedList).reduce(
			(result, [key, value]) => [...(key.split("/")[1] < staleTime ? [value] : []), ...result],
			[]
		)
		const listed = Object.fromEntries(
			(await this.state.storage.list<Layout["archive"]["users"]>({ prefix: "doc" })).entries()
		)
		const archive = Database.create<Layout>(
			{
				silos: { users: { type: "archive", idLength: 4, retainChanged: true } }, //Set through some env or something
			},
			this.environment.archive
		)
		await Promise.all(keyToBeStored.map(key => archive?.users.store(listed[key])))
		await Promise.all(
			keyToBeStored.flatMap(key => {
				const id = key.split("/").splice(-1)[0]
				this.state.storage.get<{ changed: string; key: string }>("id/" + id).then(async r => {
					r && r.key && (await this.state.storage.delete(r.key))
					r && r.changed && (await this.state.storage.delete(r.changed))
				})
			})
		)
		await this.state.storage.setAlarm(Date.now() + 5 * 1000)
	}
}
