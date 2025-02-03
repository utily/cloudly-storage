import { isoly } from "isoly"
import * as platform from "@cloudflare/workers-types"

export class Alarm {
	private alarms?: Alarm.Once[]
	private recurringAlarms?: Alarm.Recurring[]
	private actions: Record<string, (() => Promise<void>) | undefined> = {}
	constructor(private readonly storage: platform.DurableObjectStorage) {}

	async set(action: string, trigger: isoly.DateTime | number): Promise<Alarm.Once[]> {
		trigger = typeof trigger == "number" ? isoly.DateTime.create(trigger, "milliseconds") : trigger
		const next = (await this.storage.getAlarm()) ?? undefined
		this.alarms ??= (await this.storage.get<Alarm.Once[]>("alarms|")) ?? []
		this.alarms.push({ time: trigger, action: action })
		await this.storage.put("alarms|", this.alarms)
		if (!(next && isoly.DateTime.create(next, "milliseconds") < trigger))
			await this.storage.setAlarm(isoly.DateTime.parse(trigger))
		return this.alarms
	}
	async recurring(
		action: string,
		unit: "years" | "months" | "days" | "hours" | "minutes" | "seconds" | "milliseconds",
		interval: number,
		start: isoly.DateTime | number = isoly.DateTime.now()
	): Promise<Alarm.Recurring[]> {
		start = typeof start == "number" ? isoly.DateTime.create(start, "milliseconds") : start
		const trigger = this.#nextRecurring(start, unit, interval)
		this.recurringAlarms = (await this.storage.get<Alarm.Recurring[]>("alarms|recurring")) ?? []
		this.recurringAlarms.push({ next: trigger, unit: unit, interval: interval, action: action })
		await this.storage.put("alarms|recurring", this.recurringAlarms)
		const next = (await this.storage.getAlarm()) ?? undefined
		if (!(next && isoly.DateTime.create(next, "milliseconds") < trigger))
			await this.storage.setAlarm(isoly.DateTime.parse(trigger))
		return this.recurringAlarms
	}
	register(name: string, action: () => Promise<void>): Record<string, (() => Promise<void>) | undefined> {
		this.actions[name] = action
		return this.actions
	}
	async handle(): Promise<void> {
		const now = isoly.DateTime.now()
		this.alarms ??= (await this.storage.get<Alarm.Once[]>("alarms|")) ?? []

		await Promise.all(this.alarms.filter(a => a.time <= now).map(a => this.actions[a.action]?.()))

		this.recurringAlarms ??= (await this.storage.get<Alarm.Recurring[]>("alarms|recurring")) ?? []
		const occurring = this.recurringAlarms.filter(a => a.next <= now)
		await Promise.all(occurring.map(a => this.actions[a.action]?.()))
		occurring.forEach(o => (o.next = this.#nextRecurring(o.next, o.unit, o.interval)))
		const notOccurring = this.recurringAlarms.filter(a => !occurring.includes(a))
		const futureOccurring = occurring.concat(notOccurring)
		this.recurringAlarms = undefined
		futureOccurring.sort((t1, t2) => {
			if (t1.next < t2.next)
				return -1
			if (t1.next > t2.next)
				return 1
			return 0
		})
		if (futureOccurring.length > 0)
			await this.storage.put("alarms|recurring", futureOccurring)

		const next = this.alarms
			.filter(a => a.time > now)
			.sort((t1, t2) => {
				if (t1.time < t2.time)
					return -1
				if (t1.time > t2.time)
					return 1
				return 0
			})
		this.alarms = undefined
		if (next.length > 0) {
			await this.storage.put("alarms|", next)
		} else {
			await this.storage.delete("alarms|")
		}
		if (futureOccurring.length > 0 && next.length > 0) {
			await (futureOccurring[0].next > next[0].time
				? this.storage.setAlarm(isoly.DateTime.parse(next[0].time))
				: this.storage.setAlarm(isoly.DateTime.parse(futureOccurring[0].next)))
		} else if (futureOccurring.length > 0)
			await this.storage.setAlarm(isoly.DateTime.parse(futureOccurring[0].next))
		else if (next.length > 0) {
			await this.storage.setAlarm(isoly.DateTime.parse(next[0].time))
		}
	}

	#nextRecurring(
		now: isoly.DateTime,
		unit: "years" | "months" | "days" | "hours" | "minutes" | "seconds" | "milliseconds",
		interval: number
	): isoly.DateTime {
		let next: isoly.DateTime
		switch (unit) {
			case "years":
				next = isoly.DateTime.nextYear(now, interval)
				break
			case "months":
				next = isoly.DateTime.nextMonth(now, interval)
				break
			case "days":
				next = isoly.DateTime.nextDay(now, interval)
				break
			case "hours":
				next = isoly.DateTime.nextHour(now, interval)
				break
			case "minutes":
				next = isoly.DateTime.nextMinute(now, interval)
				break
			case "seconds":
				next = isoly.DateTime.nextSecond(now, interval)
				break
			case "milliseconds":
				next = isoly.DateTime.nextMillisecond(now, interval)
				break
		}
		return next
	}
	async clearRecurring(): Promise<void> {
		await this.storage.delete("alarms|recurring")
	}
	async clear(): Promise<void> {
		await this.storage.delete("alarms|")
	}
}
export namespace Alarm {
	export interface Once {
		time: isoly.DateTime
		action: string
	}
	export interface Recurring {
		next: isoly.DateTime
		unit: "years" | "months" | "days" | "hours" | "minutes" | "seconds" | "milliseconds"
		interval: number
		action: string
	}
}
