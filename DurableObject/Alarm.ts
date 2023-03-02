import * as isoly from "isoly"
import * as platform from "@cloudflare/workers-types"

export class Alarm {
	private actions: Record<string, (() => Promise<void>) | undefined> = {}

	constructor(private readonly storage: platform.DurableObjectStorage) {}

	async set(action: string, trigger: isoly.DateTime | number): Promise<{ time: isoly.DateTime; action: string }[]> {
		trigger = typeof trigger == "number" ? isoly.DateTime.create(trigger, "milliseconds") : trigger
		const next = (await this.storage.getAlarm()) ?? undefined
		const alarms = (await this.storage.get<{ time: isoly.DateTime; action: string }[]>("alarms|")) ?? []
		alarms.push({ time: trigger, action: action })
		await this.storage.put("alarms|", alarms)
		if (!(next && isoly.DateTime.create(next, "milliseconds") < trigger))
			await this.storage.setAlarm(isoly.DateTime.parse(trigger))
		return alarms
	}
	async recurring(
		action: string,
		unit: "years" | "months" | "days" | "hours" | "minutes" | "seconds" | "milliseconds",
		interval: number,
		start: isoly.DateTime | number = isoly.DateTime.now()
	): Promise<
		{
			next: isoly.DateTime
			unit: "years" | "months" | "days" | "hours" | "minutes" | "seconds" | "milliseconds"
			interval: number
			action: string
		}[]
	> {
		start = typeof start == "number" ? isoly.DateTime.create(start, "milliseconds") : start
		const trigger = this.#nextRecurring(start, unit, interval)
		const alarms =
			(await this.storage.get<
				{
					next: isoly.DateTime
					unit: "years" | "months" | "days" | "hours" | "minutes" | "seconds" | "milliseconds"
					interval: number
					action: string
				}[]
			>("alarms|recurring")) ?? []
		alarms.push({ next: trigger, unit: unit, interval: interval, action: action })
		await this.storage.put("alarms|recurring", alarms)
		const next = (await this.storage.getAlarm()) ?? undefined
		if (!(next && isoly.DateTime.create(next, "milliseconds") < trigger))
			await this.storage.setAlarm(isoly.DateTime.parse(trigger))
		return alarms
	}
	async register(
		name: string,
		action: () => Promise<void>
	): Promise<Record<string, (() => Promise<void>) | undefined>> {
		this.actions[name] = action
		return this.actions
	}
	async handle(): Promise<void> {
		const now = isoly.DateTime.now()
		const alarms = (await this.storage.get<{ time: isoly.DateTime; action: string }[]>("alarms|")) ?? []
		alarms.sort((t1, t2) => {
			if (t1.time < t2.time)
				return -1
			if (t1.time > t2.time)
				return 1
			return 0
		})
		await Promise.all(alarms.filter(a => a.time <= now).map(a => this.actions[a.action]?.()))
		const next = alarms.filter(a => a.time > now)
		if (next.length > 0) {
			await this.storage.put("alarms|", next)
		} else {
			await this.storage.delete("alarms|")
		}

		const recurring =
			(await this.storage.get<
				{
					next: isoly.DateTime
					unit: "years" | "months" | "days" | "hours" | "minutes" | "seconds" | "milliseconds"
					interval: number
					action: string
				}[]
			>("alarms|recurring")) ?? []
		const occurring = recurring.filter(a => a.next <= now)
		const notOccurring = recurring.filter(a => a.next > now)
		await Promise.all(occurring.map(a => this.actions[a.action]?.()))
		occurring.forEach(o => (o.next = this.#nextRecurring(now, o.unit, o.interval)))
		const futureOccurring = occurring.concat(notOccurring)
		futureOccurring.sort((t1, t2) => {
			if (t1.next < t2.next)
				return -1
			if (t1.next > t2.next)
				return 1
			return 0
		})
		if (futureOccurring.length > 0)
			await this.storage.put("alarms|recurring", futureOccurring)

		if (futureOccurring.length > 0 && next.length > 0) {
			futureOccurring[0].next > next[0].time
				? await this.storage.setAlarm(isoly.DateTime.parse(next[0].time))
				: await this.storage.setAlarm(isoly.DateTime.parse(futureOccurring[0].next))
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
