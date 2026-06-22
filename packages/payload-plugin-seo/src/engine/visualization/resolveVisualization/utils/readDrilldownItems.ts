export const readDrilldownItems = (
  data: Record<string, unknown> | undefined,
  key: string
): { left: string; right: string }[] | undefined => {
  const value = data?.[key];

  return Array.isArray(value) ? (value as { left: string; right: string }[]) : undefined;
};
