export function shiftDateByDays(d: Date, days: number) {
  const date = new Date(d);

  date.setUTCDate(date.getUTCDate() + days);

  return date;
}
