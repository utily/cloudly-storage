import * as platform from "@cloudflare/workers-types"
import { Alarm } from "./Alarm"

export class Storage {
	private keyLimit = 128
	private constructor(private readonly storage: platform.DurableObjectState["storage"], public readonly alarm: Alarm) {}

	async put<T = unknown>(
		data: Record<string, T>,
		options?: platform.DurableObjectPutOptions
	): Promise<Record<string, T>> {
		let result: Record<string, T> = {}
		const promises: Promise<void>[] = []
		const tupleList = Object.entries(data)
		for (let i = 0; i < tupleList.length; i += this.keyLimit) {
			const segment = Object.fromEntries(tupleList.slice(i, i + this.keyLimit))
			promises.push(this.storage.put<T>(segment, options))
			result = { ...result, ...segment }
		}
		await Promise.all(promises)
		return result
	}
	async get<T = unknown>(data: string): Promise<T | undefined>
	async get<T = unknown>(data: string[]): Promise<Map<string, T>>
	async get<T = unknown>(data: string | string[]): Promise<Map<string, T> | T | undefined> {
		let result: T | Map<string, T> | undefined
		if (typeof data == "string")
			result = await this.storage.get<T>(data)
		else {
			const promises: Promise<Map<string, T>>[] = []
			for (let i = 0; i < data.length; i += this.keyLimit) {
				const segment = data.slice(i, i + this.keyLimit)
				promises.push(this.storage.get<T>(segment))
			}
			result = (await Promise.all(promises)).reduce((r: Map<string, T>, e) => new Map([...r, ...e]), new Map())
		}
		return result
	}
	async remove(keys: string[]): Promise<boolean[]> {
		const promises: Promise<boolean[]>[] = []
		for (let i = 0; i < keys.length; i += this.keyLimit) {
			const segment = keys.slice(i, i + this.keyLimit)
			promises.push(
				this.storage.delete(segment).then(r => {
					const fails = segment.length - r
					const result = []
					for (let i = 0; i < segment.length; i++)
						result.push(i < fails ? false : true)
					return result
				})
			)
		}
		return (await Promise.all(promises)).flat()
	}
	async list<T = unknown>(options?: platform.DurableObjectListOptions): Promise<Map<string, T>> {
		return this.storage.list(options)
	}
	async deleteAll(options?: platform.DurableObjectPutOptions): Promise<void> {
		return this.storage.deleteAll(options)
	}
	async getAlarm(options?: platform.DurableObjectGetAlarmOptions): Promise<number | null> {
		return this.storage.getAlarm(options)
	}
	async setAlarm(scheduledTime: number | Date, options?: platform.DurableObjectSetAlarmOptions): Promise<void> {
		return this.storage.setAlarm(scheduledTime, options)
	}
	async deleteAlarm(options?: platform.DurableObjectSetAlarmOptions): Promise<void> {
		return this.storage.deleteAlarm(options)
	}
	static open(storage: platform.DurableObjectState["storage"], alarm?: Alarm): Storage
	static open(storage: platform.DurableObjectState["storage"] | undefined, alarm?: Alarm): Storage | undefined
	static open(storage: platform.DurableObjectState["storage"] | undefined, alarm?: Alarm): Storage | undefined {
		return storage ? new Storage(storage, alarm ?? new Alarm(storage)) : undefined
	}
}
