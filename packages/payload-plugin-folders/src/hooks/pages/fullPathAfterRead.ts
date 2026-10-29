import type { CollectionAfterReadHook, FieldHook } from "payload";

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

/**
 * Sets `fullPath` from `folderPath` and `pathSegment`, which a read already holds, so it costs no
 * query of its own. It is a collection hook because Payload populates the virtual `folderPath`
 * after every field-level `afterRead` hook has run, so a hook on the `fullPath` field itself would
 * see the path still unset. With `locale=all` both inputs are objects keyed by locale and the
 * result is one too.
 */
export const buildFullPathAfterRead =
  (): CollectionAfterReadHook =>
  ({ doc, req }) => {
    // A `select` that leaves out both the folder and the segment has nothing to compose from.
    if (!("folder" in doc) && !("pathSegment" in doc)) {
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
    const valueOf = (value: unknown, code: string): unknown =>
      isValuesByLocale(value) ? value[code] : value;

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
