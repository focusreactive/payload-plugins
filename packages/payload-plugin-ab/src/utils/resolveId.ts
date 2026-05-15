interface BaseDocument {
  id: number | string;
}

const isValueIsBaseDocument = (value: object): value is BaseDocument => "id" in value;

export function resolveId(value: unknown) {
  if (!value) {return null;}

  if (typeof value === "number" || typeof value === "string") {return value;}

  if (typeof value === "object" && isValueIsBaseDocument(value)) {
    return value.id;
  }

  return null;
}
