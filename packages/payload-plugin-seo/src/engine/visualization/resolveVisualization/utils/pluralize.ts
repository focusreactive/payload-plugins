export const pluralize = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;
