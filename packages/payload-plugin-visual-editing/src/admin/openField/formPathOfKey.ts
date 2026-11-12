import { FIELD_PATH_SEPARATOR, isRowIndex } from "../../shared/fieldKey.js";

type KeyedField = { key: string; path: string };

type FormRows = Readonly<
  Record<string, { readonly rows?: readonly { readonly id: number | string }[] } | undefined>
>;

const ROW_IS_GONE = -1;

export function formPathOfKey({ key, path }: KeyedField, formState: FormRows): string {
  const renderedSegments = path.split(FIELD_PATH_SEPARATOR);
  const formPath: string[] = [];

  for (const [position, segment] of key.split(FIELD_PATH_SEPARATOR).entries()) {
    const isRowId = isRowIndex(renderedSegments[position] ?? "");
    if (!isRowId) {
      formPath.push(segment);
      continue;
    }
    const rows = formState[formPath.join(FIELD_PATH_SEPARATOR)]?.rows ?? [];
    const rowIndex = rows.findIndex((row) => String(row.id) === segment);
    if (rowIndex === ROW_IS_GONE) break;
    formPath.push(String(rowIndex));
  }
  return formPath.join(FIELD_PATH_SEPARATOR);
}
