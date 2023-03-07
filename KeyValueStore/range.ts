import * as cryptly from "cryptly"
import { Continuable } from "./Continuable"
import { ListItem } from "./ListItem"
import { ListOptions } from "./ListOptions"

export function range(data: Continuable<ListItem<any, any>>, option: ListOptions): Continuable<ListItem<any, any>> {
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
	if (result.length == 0)
		result.cursor = cryptly.Base64.encode(data[data.length - 1].key, "url")
	return result
}
