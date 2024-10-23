import { cryptly } from "cryptly"
import { isoly } from "isoly"
import * as platform from "@cloudflare/workers-types"
import { KeyValueStore } from "./KeyValueStore"
import { Continuable } from "./KeyValueStore/Continuable"

export class AuditLogger<T extends Record<string, string>> {
	private entry: AuditLogger.Entry<T> | undefined
	private constructor(
		private readonly store: KeyValueStore.Indexed<AuditLogger.Entry<T>, "resource">,
		private readonly executionContext: platform.ExecutionContext
	) {}
	finalize(): void {
		if (this.entry) {
			this.executionContext.waitUntil(
				this.store.set(`${isoly.DateTime.invert(this.entry.created)}|${this.entry.id}`, this.entry)
			)
		}
	}
	configure(resource: Partial<AuditLogger.Resource<T>>, by?: string): void {
		this.entry = {
			id: this.entry?.id ?? cryptly.Identifier.generate(4),
			created: this.entry?.created ?? isoly.DateTime.now(),
			resource: { type: "unknown", action: "unknown", ...this.entry?.resource, ...resource },
			by: by ?? this.entry?.by ?? "unknown",
			messages: [],
		}
	}
	async list(options?: {
		resource?: Extract<keyof T, string>
		limit?: number
		cursor?: string
		range?: [string, string]
	}): Promise<Continuable<AuditLogger.Entry<T>>> {
		const list = await this.store.list({
			index: options?.resource && "resource",
			prefix: options?.resource && options.resource + "|",
			limit: options?.limit,
			cursor: options?.cursor,
			range: options?.range,
			values: true,
		})
		const result = list.reduce<Continuable<AuditLogger.Entry<T>>>((r: AuditLogger.Entry<T>[], e) => {
			e.value && r.push(e.value)
			return r
		}, [])
		result.cursor = list.cursor
		return result
	}
	log(message: string): void {
		this.entry && this.entry.messages.push(message)
	}

	static open<T extends Record<string, string>>(
		store: KeyValueStore,
		executionContext: platform.ExecutionContext
	): AuditLogger<T> | undefined {
		const partitioned = KeyValueStore.partition<AuditLogger.Entry<T>>(store, "audit|")
		const indexed = KeyValueStore.Indexed.create(partitioned, {
			resource: (entry: AuditLogger.Entry<T>) =>
				`${entry.resource.type}|${isoly.DateTime.invert(entry.created)}|${entry.id}`,
		})
		return new this(indexed, executionContext)
	}
}
export namespace AuditLogger {
	export type Resource<T extends Record<string, string>> = {
		[K in keyof T]: {
			id?: string
			type: Extract<K, string> | "unknown"
			action: T[K] | "unknown"
			before?: unknown
			after?: unknown
		}
	}[keyof T]
	export interface Entry<T extends Record<string, string>> {
		id: string
		created: isoly.DateTime
		resource: Resource<T>
		by: string
		messages: string[]
	}
}
