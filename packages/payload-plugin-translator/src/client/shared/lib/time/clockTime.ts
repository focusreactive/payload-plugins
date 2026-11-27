import type { IsoDateTime } from "../../../../types/wire/primitives.js";

const CLOCK = new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hour12: false });

export function clockTime(iso: IsoDateTime): string {
  return CLOCK.format(new Date(iso));
}
