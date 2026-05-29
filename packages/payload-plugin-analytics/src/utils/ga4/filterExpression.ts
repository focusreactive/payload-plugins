export interface AbFilterExpression {
  filter?: {
    fieldName: string;
    stringFilter?: { matchType?: string; value: string };
    inListFilter?: { values: string[] };
  };
  andGroup?: { expressions?: AbFilterExpression[] };
}

export function exact(fieldName: string, value: string): AbFilterExpression {
  return { filter: { fieldName, stringFilter: { matchType: "EXACT", value } } };
}
