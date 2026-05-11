export function withInListFilter<R extends object>(
  req: R,
  fieldName: string,
  values: string[],
): R & { dimensionFilter: { filter: { fieldName: string; inListFilter: { values: string[] } } } } {
  return {
    ...req,
    dimensionFilter: {
      filter: { fieldName, inListFilter: { values } },
    },
  };
}
