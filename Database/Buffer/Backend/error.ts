import { Error } from "../../../Error"

export function error(point: Error.Point, error?: any, id?: string): Error {
	return Error.create(`Backend.${point}`, error, id)
}
