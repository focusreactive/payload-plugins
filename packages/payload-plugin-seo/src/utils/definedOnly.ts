export function definedOnly(values: Record<string, number | undefined>): Record<string, number> {
  const defined: Record<string, number> = {};

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) defined[key] = value;
  }

  return defined;
}
