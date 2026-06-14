export const readNumber = (data: Record<string, unknown> | undefined, key: string): number | undefined => {
  const value = data?.[key];

  return typeof value === "number" ? value : undefined;
};
