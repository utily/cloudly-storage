import { Error } from "../Error"
import { Alarm } from "./Alarm"
import { Client as ClientClass } from "./Client"
import { Namespace } from "./Namespace"
import { Portion } from "./Portion"

type Client<E = Error> = ClientClass<E> // only export interface

export { Alarm, Client, Namespace, Portion }
