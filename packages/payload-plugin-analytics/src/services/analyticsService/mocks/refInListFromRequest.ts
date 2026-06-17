interface Expr {
  filter?: { fieldName?: string; inListFilter?: { values?: string[] } };
  andGroup?: { expressions?: Expr[] };
}

function find(expr: Expr | undefined, dim: string): string[] | null {
  if (!expr) return null;
  if (expr.filter?.fieldName === dim && expr.filter.inListFilter?.values) {
    return expr.filter.inListFilter.values;
  }
  for (const child of expr.andGroup?.expressions ?? []) {
    const hit = find(child, dim);
    if (hit) return hit;
  }
  return null;
}

export function refInListFromRequest(request: { dimensionFilter?: Expr }, pageRefDim: string): string[] | null {
  return find(request.dimensionFilter, pageRefDim);
}
