/* eslint-disable no-console -- CLI output */
const started = Date.now();

const stamp = () => `${((Date.now() - started) / 1000).toFixed(1).padStart(6)}s`;

export const log = {
  info: (message: string) => console.log(`${stamp()}  ${message}`),
  step: (message: string) => console.log(`\n${stamp()}  ▸ ${message}`),
  warn: (message: string) => console.warn(`${stamp()}  ⚠ ${message}`),
  table: (rows: Record<string, string | number>[]) => console.table(rows),
};
