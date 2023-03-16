import * as cryptly from "cryptly"
import * as platform from "@cloudflare/workers-types"
import { Continuable } from "./Continuable"
import { ListItem } from "./ListItem"
import { ListOptions } from "./ListOptions"

export function range(
	data: platform.KVNamespaceListResult<unknown, string>,
	option: ListOptions
): platform.KVNamespaceListResult<unknown, string> {
	console.log("RUN?")
	let start: string, end: string
	const result = data
	if (option.range) {
		start = option.range[0] ?? ""
		end = option.range[1] ?? ""
	} else
		return result
	if (end == "")
		result.keys = result.keys.filter(i => i.name >= start)
	else
		result.keys = result.keys.filter(i => i.name >= start && i.name < end)
	if (option.limit && result.keys.length > option.limit) {
		result.keys = result.keys.slice(0, option.limit)
		result.list_complete = false
		if (!result.list_complete)
			result.cursor = cryptly.Base64.encode(result.keys[option.limit - 1].name, "url")
	}
	const lastItem = data.keys.at(-1)
	if (
		!data.list_complete &&
		((result.keys.length == 0 && data.keys.length) ||
			(result.keys.length && lastItem && result.keys.includes(lastItem)))
	) {
		result.list_complete = false
		if (!result.list_complete)
			result.cursor = cryptly.Base64.encode(data.keys[data.keys.length - 1].name, "url")
	}
	return result
}

export function rangeLocal(
	data: Continuable<ListItem<any, any>>,
	option: ListOptions
): Continuable<ListItem<any, any>> {
	let start: string, end: string
	let result = data
	if (option.range) {
		start = option.range[0] ?? ""
		end = option.range[1] ?? ""
	} else
		return result
	if (end == "")
		result = result.filter(i => i.key >= start)
	else
		result = result.filter(i => i.key >= start && i.key < end)
	if (option.limit && result.length > option.limit) {
		result = result.slice(0, option.limit)
		result.cursor = cryptly.Base64.encode(result[option.limit - 1].key, "url")
	}
	const lastItem = data.at(-1)
	if ((result.length == 0 && data.length) || (result.length && lastItem && result.includes(lastItem)))
		result.cursor = cryptly.Base64.encode(data[data.length - 1].key, "url")
	return result
}
