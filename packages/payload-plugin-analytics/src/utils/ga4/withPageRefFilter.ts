import type { AbFilterExpression } from "./filterExpression";

export function withPageRefFilter<R extends object & { dimensionFilter?: AbFilterExpression }>(req: R, pageRefDim: string, refs: string[]): R & { dimensionFilter?: AbFilterExpression } {
  if (refs.length === 0) return req;

  const inList: AbFilterExpression = {
    filter: {
      fieldName: pageRefDim,
      inListFilter: { values: refs },
    },
  };
  const existing = req.dimensionFilter;

  const dimensionFilter: AbFilterExpression = existing ? { andGroup: { expressions: [existing, inList] } } : inList;

  return { ...req, dimensionFilter };
}
