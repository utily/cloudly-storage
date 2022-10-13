import * as cryptly from "cryptly"
import * as isoly from "isoly"
import * as model from "../model"
import { TestStorage } from "./TestStorage"

export namespace TestSetup {
	const collection = TestStorage.collection?.users
	const archive = TestStorage.archive?.users
	export const partitions = [
		{ collection: collection, archive: archive, partitions: "noPartition" },
		{
			collection: collection?.partition("oneShard"),
			archive: archive?.partition("oneShard"),
			partitions: "oneShard",
		},
		{
			collection: collection?.partition("twoShards"),
			archive: archive?.partition("twoShards"),
			partitions: "twoShards",
		},
		{
			collection: collection?.partition("fourShards"),
			archive: archive?.partition("fourShards"),
			partitions: "fourShards",
		},
	]
	export const createdDate = "2022-08-15"
	export const createdTime = "T01:50:03.649Z"
	export const user = {
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
	export const numberOfUsers = 256
	export const dateSplit = 4
	export const primitiveUsers = createIds(numberOfUsers, "CO").map(id => ({ ...user, id }))
	export const collectionUsers = splitOnDates(dateSplit, createdDate, primitiveUsers)
	export const archiveUsers = splitOnDates(
		4,
		createdDate,
		createIds(numberOfUsers, "AR").map(id => ({ ...user, id }))
	)
	export function splitOnDates(dates: number, lastDate: isoly.Date, users: model.User[]) {
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
	export function createIds(ids: number, suffix?: string): string[] {
		const result: string[] = []
		for (let seed = 0; seed < ids; seed++)
			result.push(cryptly.Identifier.fromBinary(new Uint8Array([seed ?? 0])) + suffix ?? "AA")
		return result
	}
}
