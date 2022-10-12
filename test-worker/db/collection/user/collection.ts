import * as cryptly from "cryptly"
import * as isoly from "isoly"
import { TestStorage } from "../../../Context/TestStorage"
import * as model from "../../../model"

export const collection = TestStorage.collection?.users
export const archive = TestStorage.archive?.users
export const createdDate = "2022-08-15"
export const createdTime = "T01:50:03.649Z"
const user = {
	level: 0,
	id: "AAAA",
	groups: ["group2"],
	name: "Bia",
	created: createdDate + createdTime,
}
export const selectionRange = 2
export const selection = {
	limit: 50,
	created: { start: isoly.Date.previous(createdDate, selectionRange - 1), end: createdDate },
}
function splitOnDates(dates: number, lastDate: isoly.Date, users: model.User[]) {
	const result: model.User[] = []
	const portion = Math.floor(users.length / dates)
	for (let date = 0; date < dates; date++) {
		const toBeAdded = users
			.slice(result.length, result.length + portion)
			.map(user => ({ ...user, created: isoly.Date.previous(lastDate, date) + createdTime }))
		result.push(...toBeAdded)
	}
	return result
}
function createIds(ids: number, suffix?: string): string[] {
	const result: string[] = []
	for (let seed = 0; seed < ids; seed++) {
		result.push(cryptly.Identifier.fromBinary(new Uint8Array([seed ?? 0])) + suffix ?? "AA")
	}
	return result
}
const numberOfUsers = 256
export const dateSplit = 4
const primitiveUsers = createIds(numberOfUsers, "CO").map(id => ({ ...user, id }))
export const users = splitOnDates(dateSplit, createdDate, primitiveUsers)
export const archiveUsers = splitOnDates(
	4,
	createdDate,
	createIds(numberOfUsers, "AR").map(id => ({ ...user, id }))
)
