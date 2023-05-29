import { User as modelUser } from "./User"

export type User = modelUser

export namespace User {
	export const is = modelUser.is
	export const isMeta = modelUser.isMeta
	export const split = modelUser.split
}
