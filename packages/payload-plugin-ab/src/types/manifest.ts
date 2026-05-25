export type Manifest<TVariantData extends object = object> = Record<
  string,
  TVariantData[]
>;
