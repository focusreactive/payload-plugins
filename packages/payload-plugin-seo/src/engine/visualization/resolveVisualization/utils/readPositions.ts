export const readPositions = (data: Record<string, unknown> | undefined): number[] | undefined => {
  const value = data?.positions;

  return Array.isArray(value) ? (value as number[]) : undefined;
};
