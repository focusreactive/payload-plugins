// Resolves a data path (e.g. `translation.forms.privacyPolicy` or `layout.2.heading`)
// against the raw Payload fields config into an ordered chain of DOM operations
// needed to make the target field visible before focus.
//
// Three instruction kinds — see `executor` in expandAndFocus.ts:
//   - tab         → click the tabs-field button at `tabIndex` (scope narrowed by
//                   earlier row/collapsible instructions)
//   - collapsible → click the toggle inside `#field-collapsible-<path__>`
//   - row         → click the toggle inside `#<rowContainerId>`
//
// Collapsible DOM ids use Payload's `path` (see `getFieldPaths.js`), which is
// the data-shape path with `_index-<N-M-...>` segments for unnamed ancestors.
// Unnamed containers inside other unnamed containers *accumulate* indices with
// hyphens, e.g. an unnamed group at index 0 containing a collapsible at index
// 12 becomes `_index-0-12`, not `_index-0._index-12`. We track this via the
// `indexStack`, which resets at every named descent and extends at every
// unnamed descent.

export type ResolverField = {
  type: string;
  name?: string;
  fields?: ResolverField[];
  tabs?: ResolverTab[];
  blocks?: ResolverBlock[];
};

export type ResolverTab = {
  name?: string;
  fields: ResolverField[];
};

export type ResolverBlock = {
  slug?: string;
  fields: ResolverField[];
};

export type ContainerInstruction =
  | { kind: "tab"; tabIndex: number }
  | { kind: "collapsible"; path: string }
  | { kind: "row"; rowContainerId: string };

export type ResolvedPath = {
  chain: ContainerInstruction[];
  fieldId: string | null;
};

export const resolveContainerChain = (
  path: string,
  fields: readonly ResolverField[]
): ResolvedPath | null => {
  if (!path) return null;
  const segments = path.split(".");
  const chain = walkFields(fields, segments, 0, "", []);
  if (chain === null) return null;

  const last = segments[segments.length - 1]!;
  const fieldId = /^\d+$/.test(last) ? null : `field-${path.replace(/\./g, "__")}`;
  return { chain, fieldId };
};

// `dataPath` is the path up to the current named ancestor (drops all `_index`).
// `indexStack` accumulates positions inside unnamed ancestors since the last
// named descent — matches Payload's `parentIndexPath` + trailing `index`.
const walkFields = (
  fields: readonly ResolverField[],
  segments: readonly string[],
  segIndex: number,
  dataPath: string,
  indexStack: readonly number[]
): ContainerInstruction[] | null => {
  if (segIndex >= segments.length) return [];
  const segment = segments[segIndex]!;

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]!;
    const result = descendInto(field, i, segment, segments, segIndex, dataPath, indexStack);
    if (result !== null) return result;
  }
  return null;
};

// Payload's path for an unnamed container: `<named-ancestor-path>._index-<idx-stack>`.
const unnamedPath = (dataPath: string, indexStack: readonly number[], index: number): string => {
  const suffix = `_index-${[...indexStack, index].join("-")}`;
  return dataPath ? `${dataPath}.${suffix}` : suffix;
};

const descendInto = (
  field: ResolverField,
  i: number,
  segment: string,
  segments: readonly string[],
  segIndex: number,
  dataPath: string,
  indexStack: readonly number[]
): ContainerInstruction[] | null => {
  switch (field.type) {
    case "row": {
      if (!field.fields) return null;
      // Transparent. Extend indexStack so nested collapsible paths stay aligned with Payload.
      return walkFields(field.fields, segments, segIndex, dataPath, [...indexStack, i]);
    }
    case "collapsible": {
      if (!field.fields) return null;
      const sub = walkFields(field.fields, segments, segIndex, dataPath, [...indexStack, i]);
      if (sub === null) return null;
      return [{ kind: "collapsible", path: unnamedPath(dataPath, indexStack, i) }, ...sub];
    }
    case "tabs": {
      if (!field.tabs) return null;
      // The tabs field itself occupies an index slot among its siblings. If the
      // match lives inside an unnamed tab, that tab's index also extends the
      // stack. Named tabs reset everything.
      for (let t = 0; t < field.tabs.length; t++) {
        const tab = field.tabs[t]!;
        let advance: number;
        let nextDataPath: string;
        let nextIndexStack: readonly number[];
        if (tab.name) {
          if (tab.name !== segment) continue;
          advance = 1;
          nextDataPath = dataPath ? `${dataPath}.${tab.name}` : tab.name;
          nextIndexStack = [];
        } else {
          advance = 0;
          nextDataPath = dataPath;
          nextIndexStack = [...indexStack, i, t];
        }
        const sub = walkFields(
          tab.fields,
          segments,
          segIndex + advance,
          nextDataPath,
          nextIndexStack
        );
        if (sub === null) continue;
        return [{ kind: "tab", tabIndex: t }, ...sub];
      }
      return null;
    }
    case "group": {
      if (!field.fields) return null;
      if (!field.name) {
        return walkFields(field.fields, segments, segIndex, dataPath, [...indexStack, i]);
      }
      if (field.name !== segment) return null;
      const nextData = dataPath ? `${dataPath}.${field.name}` : field.name;
      return walkFields(field.fields, segments, segIndex + 1, nextData, []);
    }
    case "array":
    case "blocks": {
      if (field.name !== segment) return null;
      const nextData = dataPath ? `${dataPath}.${field.name}` : field.name;

      if (segIndex + 1 >= segments.length) return [];
      const rawIndex = segments[segIndex + 1]!;
      if (!/^\d+$/.test(rawIndex)) return null;

      const rowContainerId = `${nextData.replace(/\./g, "-")}-row-${rawIndex}`;
      const rowInstruction: ContainerInstruction = { kind: "row", rowContainerId };
      const descendedData = `${nextData}.${rawIndex}`;

      if (segIndex + 2 >= segments.length) return [rowInstruction];

      if (field.type === "array") {
        if (!field.fields) return null;
        const sub = walkFields(field.fields, segments, segIndex + 2, descendedData, []);
        return sub === null ? null : [rowInstruction, ...sub];
      }
      if (!field.blocks) return null;
      for (const block of field.blocks) {
        const sub = walkFields(block.fields, segments, segIndex + 2, descendedData, []);
        if (sub !== null) return [rowInstruction, ...sub];
      }
      return null;
    }
    default: {
      if (field.name === segment && segIndex === segments.length - 1) return [];
      return null;
    }
  }
};
