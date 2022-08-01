import * as isoly from "isoly";

export type Selection = {
	changed: isoly.TimeRange;
} |
{
	cursor: string;
} |
{
	created: isoly.TimeRange;
} |
	undefined;
