import * as isoly from "isoly"
import "./load"
import "./store"
import "./remove"
import "./update"
import "./append"
import { DurableObjectState } from "../../../platform"
import { Archivist } from "./Archivist"
import { Context } from "./Context"
import { Environment } from "./Environment"

export class Backend {
	private partitions: string[] | undefined
	private documentType: string | undefined
	private idLength: number
	private snooze: number
	private archiveTime: number
	private readonly changedPrecision = "seconds"

	private constructor(private readonly state: DurableObjectState, private environment: Environment) {
		this.state.blockConcurrencyWhile(async () => {
			this.partitions = (await this.state.storage.get("partitions")) ?? this.partitions
			!!(await this.state.storage.getAlarm()) ||
				(await (async () => {
					await this.state.storage.setAlarm(Date.now() + 10 * 1000)
					return true
				})())
		})
	}
	async fetch(request: Request): Promise<Response> {
		this.state.waitUntil(this.configure(request))
		return this.state.blockConcurrencyWhile(() =>
			Context.handle(request, {
				...(this.environment ?? {}),
				state: this.state,
				changedPrecision: this.changedPrecision,
			})
		)
	}
	async configure(request: Request): Promise<void> {
		const snooze = +(request.headers.get("seconds-between-archives") ?? NaN)
		this.snooze = this.snooze ?? (Number.isNaN(snooze) ? undefined : snooze)
		const archiveTime = +(request.headers.get("seconds-in-buffer") ?? NaN)
		this.archiveTime = this.archiveTime ?? (Number.isNaN(archiveTime) ? undefined : archiveTime)
		const idLength = +(request.headers.get("length") ?? NaN)
		this.idLength = this.idLength ?? (Number.isNaN(idLength) ? undefined : idLength)
		this.state.waitUntil(
			(async (): Promise<any> =>
				(await this.state.storage.get("idLength")) ??
				(idLength ? this.state.storage.put("idLength", idLength) : Promise.resolve()))()
		)
		const documentType = request.headers.get("document-type")
		!this.documentType &&
			!(this.documentType = await this.state.storage.get("documentType")) &&
			documentType &&
			this.state.waitUntil(this.state.storage.put("documentType", (this.documentType = documentType)))
		const partitions = request.headers.get("partitions")?.split("/").slice(0, -1)
		!this.partitions &&
			!(this.partitions = await this.state.storage.get("partitions")) &&
			partitions &&
			this.state.waitUntil(this.state.storage.put("partitions", (this.partitions = partitions)))
	}

	async alarm(): Promise<void> {
		const now = Date.now()
		const archiveThreshold = isoly.DateTime.truncate(
			isoly.DateTime.create(now - this.archiveTime * 1000, "milliseconds"),
			this.changedPrecision
		)
		console.log("aaaaaaaaaaaaaaaaaaa")
		this.state.blockConcurrencyWhile(async () => {
			const partitions = this.partitions ?? (await this.state.storage.get("partitions"))
			const documentType = this.documentType ?? (await this.state.storage.get("documentType"))
			const archivist = Archivist.open(
				this.environment.archive,
				this.state,
				documentType ?? "",
				partitions ?? ["unknown"]
			)
			console.log("vvvvvvvvvvvvvvvvvvvvv")
			return await archivist.reconcile(archiveThreshold)
		})
		await this.state.storage.setAlarm(now + this.snooze * 1000)
	}
}
