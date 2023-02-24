import { Alarm } from "./Alarm"
import { Client as ClientClass } from "./Client"
import { Namespace } from "./Namespace"

type Client = ClientClass // only export interface

export { Alarm, Client, Namespace }
