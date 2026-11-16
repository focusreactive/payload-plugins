import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";

import type { Clinic } from "@/payload-types";

export const WEEK_DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type WeekDayValue = (typeof WEEK_DAY_ORDER)[number];

interface HoursVocabulary {
  days: Record<WeekDayValue, string>;
  closed: string;
}

// The site writes day names in full in English and as three-letter abbreviations in Spanish.
const HOURS_VOCABULARY: Record<string, HoursVocabulary> = {
  en: {
    closed: "Closed",
    days: {
      friday: "Friday",
      monday: "Monday",
      saturday: "Saturday",
      sunday: "Sunday",
      thursday: "Thursday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
    },
  },
  es: {
    closed: "Cerrado",
    days: {
      friday: "Vie",
      monday: "Lun",
      saturday: "Sáb",
      sunday: "Dom",
      thursday: "Jue",
      tuesday: "Mar",
      wednesday: "Mié",
    },
  },
};

const SCHEMA_DAY_NAMES: Record<WeekDayValue, string> = {
  friday: "Friday",
  monday: "Monday",
  saturday: "Saturday",
  sunday: "Sunday",
  thursday: "Thursday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
};

const timePattern = /^(\d{1,2}):(\d{2})$/u;

/** A time stored as 24-hour text, for example 08:00, or null when it cannot be read. */
export function parseTime(
  value: string | null | undefined
): { hours: number; minutes: number } | null {
  const match = timePattern.exec(stripMarkers(value)?.trim() ?? "");

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return hours < 24 && minutes < 60 ? { hours, minutes } : null;
}

/** 08:00 as 8:00 AM and 19:30 as 7:30 PM, as the site writes times. */
export function formatTime(value: string | null | undefined): string | null {
  const time = parseTime(value);

  if (!time) {
    return null;
  }

  const period = time.hours < 12 ? "AM" : "PM";
  const hours = time.hours % 12 === 0 ? 12 : time.hours % 12;

  return `${hours}:${String(time.minutes).padStart(2, "0")} ${period}`;
}

const toSchemaTime = (value: string | null | undefined): string | null => {
  const time = parseTime(value);

  return time
    ? `${String(time.hours).padStart(2, "0")}:${String(time.minutes).padStart(2, "0")}`
    : null;
};

interface OpenDay {
  day: WeekDayValue;
  opens: string;
  closes: string;
}

/** The clinic's rows by day; a day without a row, marked closed or with unreadable times is closed. */
function openDays(hours: Clinic["hours"]): Map<WeekDayValue, OpenDay> {
  const byDay = new Map<WeekDayValue, OpenDay>();

  for (const row of hours ?? []) {
    const day = stripMarkers(row.day) as WeekDayValue | undefined;
    const opens = toSchemaTime(row.opens);
    const closes = toSchemaTime(row.closes);

    if (day && WEEK_DAY_ORDER.includes(day) && !row.closed && opens && closes) {
      byDay.set(day, { closes, day, opens });
    }
  }

  return byDay;
}

export interface ClinicHoursLine {
  day: WeekDayValue;
  label: string;
  text: string;
}

/** Monday to Sunday, each with the day's name and its hours or Closed, in the page's language. */
export function clinicHoursLines(hours: Clinic["hours"], locale: string): ClinicHoursLine[] {
  const vocabulary = HOURS_VOCABULARY[locale] ?? HOURS_VOCABULARY.en;
  const byDay = openDays(hours);

  return WEEK_DAY_ORDER.map((day) => {
    const open = byDay.get(day);
    const text = open ? `${formatTime(open.opens)}–${formatTime(open.closes)}` : vocabulary.closed;

    return { day, label: vocabulary.days[day], text };
  });
}

export interface OpeningHoursSpecification {
  "@type": "OpeningHoursSpecification";
  dayOfWeek: string[];
  opens: string;
  closes: string;
}

/** The open days as schema.org entries, days with the same hours sharing one entry. */
export function openingHoursSpecification(hours: Clinic["hours"]): OpeningHoursSpecification[] {
  const groups = new Map<string, OpeningHoursSpecification>();
  const byDay = openDays(hours);

  for (const open of WEEK_DAY_ORDER.flatMap((day) => byDay.get(day) ?? [])) {
    const key = `${open.opens}-${open.closes}`;
    const group = groups.get(key) ?? {
      "@type": "OpeningHoursSpecification",
      closes: open.closes,
      dayOfWeek: [],
      opens: open.opens,
    };

    group.dayOfWeek.push(SCHEMA_DAY_NAMES[open.day]);
    groups.set(key, group);
  }

  return [...groups.values()];
}
