import type {
  CollectionAfterReadHook,
  CollectionBeforeOperationHook,
  FieldHook,
  SelectType,
} from "payload";

type ValuesByLocale = Record<string, unknown>;

const isValuesByLocale = (value: unknown): value is ValuesByLocale =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toText = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;

/**
 * Payload fills a virtual `folder.fullPath` after the field hooks have run and leaves the field
 * unset when the page has no folder. This hook runs first, so a page at the site root reads
 * `folderPath: null` (spec section 3.1: the top level is `null`, never missing).
 */
export const folderPathAfterRead: FieldHook = () => null;

type ComposeArgs = {
  folderPath: string | null;
  hasFolder: boolean;
  isFolderRoot: boolean;
  pathSegment: string | null;
};

/** Spec section 3.2, for one locale. `null` when the page has no segment or its folder's path is unknown. */
export const composeFullPath = ({
  folderPath,
  hasFolder,
  isFolderRoot,
  pathSegment,
}: ComposeArgs): string | null => {
  if (hasFolder && folderPath === null) {
    return null;
  }
  if (isFolderRoot) {
    return folderPath ?? "/";
  }

  // Not `joinPath`: it lowercases, and a segment saved before the plugin may not be lowercase.
  return pathSegment === null ? null : `${folderPath ?? ""}/${pathSegment}`;
};

const fullPathInputs = ["folder", "folderPath", "isFolderRoot", "pathSegment"] as const;

/**
 * A read with a `select` that names `fullPath` also has to load what it is composed from, or the
 * path comes back wrong (a root page read without `isFolderRoot` is composed as a plain page).
 * Selecting an input makes it appear in the result, which is the price of a correct path.
 */
export const selectFullPathInputsHook: CollectionBeforeOperationHook = ({ args, operation }) => {
  const select = (args as { select?: SelectType }).select;
  if (operation !== "read" || !select) {
    return args;
  }
  const isIncludeSelect = Object.values(select).some((value) => value === true);
  if (isIncludeSelect ? !select.fullPath : select.fullPath === false) {
    return args;
  }

  const inputNames = new Set<string>(fullPathInputs);
  const adjusted: SelectType = isIncludeSelect
    ? { ...select, ...Object.fromEntries(fullPathInputs.map((input) => [input, true])) }
    : Object.fromEntries(Object.entries(select).filter(([name]) => !inputNames.has(name)));

  // Dropping the last exclusion leaves `{}`, which Payload reads as an include select of nothing.
  return {
    ...args,
    select: Object.keys(adjusted).length > 0 ? adjusted : undefined,
  } as typeof args;
};

/**
 * Sets `fullPath` from `folderPath` and `pathSegment`, which a read already holds, so it costs no
 * query of its own. It is a collection hook because Payload populates the virtual `folderPath`
 * after every field-level `afterRead` hook has run, so a hook on the `fullPath` field itself would
 * see the path still unset. With `locale=all` both inputs are objects keyed by locale and the
 * result is one too. A locale without its own segment takes the default locale's, as it does in
 * `buildSegmentWhere`.
 *
 * A read whose `select` left out one of the inputs (and did not select `fullPath`, which adds
 * them) gets no `fullPath`: a path composed from part of its inputs would be wrong.
 */
export const buildFullPathAfterRead =
  (): CollectionAfterReadHook =>
  ({ doc, req }) => {
    if (!fullPathInputs.every((input) => input in doc)) {
      return doc;
    }

    const { folder, folderPath, isFolderRoot, pathSegment } = doc as Record<string, unknown>;
    const hasFolder = folder !== null && folder !== undefined;
    const compose = (folderPathOfLocale: unknown, segmentOfLocale: unknown) =>
      composeFullPath({
        folderPath: toText(folderPathOfLocale),
        hasFolder,
        isFolderRoot: Boolean(isFolderRoot),
        pathSegment: toText(segmentOfLocale),
      });

    if (!isValuesByLocale(folderPath) && !isValuesByLocale(pathSegment)) {
      doc.fullPath = compose(folderPath, pathSegment);

      return doc;
    }

    const localization = req.payload.config.localization;
    const localeCodes = localization ? localization.localeCodes : [];
    const defaultLocale = localization ? localization.defaultLocale : "";
    const valueOf = (value: unknown, code: string): string | null =>
      toText(isValuesByLocale(value) ? value[code] : value);

    doc.fullPath = Object.fromEntries(
      localeCodes.map((code) => [
        code,
        compose(
          valueOf(folderPath, code) ?? valueOf(folderPath, defaultLocale),
          valueOf(pathSegment, code) ?? valueOf(pathSegment, defaultLocale)
        ),
      ])
    );

    return doc;
  };
