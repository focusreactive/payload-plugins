import { FIELD_PATH_SEPARATOR, isRowIndex, joinFieldPath } from "../shared/fieldKey.js";
import { fieldDomIdOf, rowContainerIdOf } from "./fieldDomId.js";

export type ResolverField = {
  type: string;
  name?: string;
  fields?: ResolverField[];
  tabs?: ResolverTab[];
  blocks?: ResolverBlock[];
};

type ResolverTab = {
  name?: string;
  fields: ResolverField[];
};

type ResolverBlock = {
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
  const segments = path.split(FIELD_PATH_SEPARATOR);
  const chain = walkFields(fields, segments, 0, "", []);
  if (chain === null) return null;

  const last = segments[segments.length - 1]!;
  const fieldId = isRowIndex(last) ? null : fieldDomIdOf(path);
  return { chain, fieldId };
};

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

const unnamedPath = (dataPath: string, indexStack: readonly number[], index: number): string => {
  const suffix = `_index-${[...indexStack, index].join("-")}`;
  return joinFieldPath(dataPath, suffix);
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
      for (let t = 0; t < field.tabs.length; t++) {
        const tab = field.tabs[t]!;
        let advance: number;
        let nextDataPath: string;
        let nextIndexStack: readonly number[];
        if (tab.name) {
          if (tab.name !== segment) continue;
          advance = 1;
          nextDataPath = joinFieldPath(dataPath, tab.name);
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
      const nextData = joinFieldPath(dataPath, field.name);
      return walkFields(field.fields, segments, segIndex + 1, nextData, []);
    }
    case "array":
    case "blocks": {
      if (field.name !== segment) return null;
      const nextData = joinFieldPath(dataPath, field.name);

      if (segIndex + 1 >= segments.length) return [];
      const rawIndex = segments[segIndex + 1]!;
      if (!isRowIndex(rawIndex)) return null;

      const rowContainerId = rowContainerIdOf(nextData, rawIndex);
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
