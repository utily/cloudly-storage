import { Error } from "../Error"
import { Alarm } from "./Alarm"
import { Client as ClientClass } from "./Client"
import { Namespace } from "./Namespace"
import { Storage } from "./Storage"

type Client<E = Error> = ClientClass<E> // only export interface

export { Alarm, Client, Namespace, Storage }
