import { User as modelUser } from "./User"

export type User = modelUser

export namespace User {
	export const is = modelUser.is
}
