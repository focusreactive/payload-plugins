import { toWords } from "payload/shared";

import type { PathSegment } from "../../../core/domain/content-projection/idPath.js";
import { elementSegment, makeIdPath } from "../../../core/domain/content-projection/idPath.js";
import {
  isTranslatableLeaf,
  leafSourceText,
} from "../../../core/domain/content-projection/translatableLeaf.js";
import type {
  ChildCursor,
  FieldLike,
  FieldWalker,
} from "../../../core/kernel/field-traversal/index.js";
import {
  ARRAY_ELEMENT,
  blockElement,
  elementName,
  resolveBlockFields,
  walkFields,
} from "../../../core/kernel/field-traversal/index.js";
import { isObject } from "../../../core/kernel/utils/isObject.js";
import type { LeafAddress } from "../../../types/wire/primitives.js";
import type { TreeNode } from "../../../types/wire/DocumentTranslationState.js";

import type { CollectionPresentation } from "./collectionPresentation.js";

/** The data position, the address being built, and the name path the config is indexed by. */
type Cursor = {
  data: Record<string, unknown>;
  segments: PathSegment[];
  path: string[];
};

const addressesOf = (nodes: readonly TreeNode[]): LeafAddress[] =>
  nodes.flatMap((node) => {
    if (node.kind === "group") return addressesOf(node.children);
    if (node.kind === "whole-list") return [...node.addresses];
    return [node.address];
  });

class TreeBuilder {
  private readonly presentation: CollectionPresentation;

  constructor(presentation: CollectionPresentation) {
    this.presentation = presentation;
  }

  private labelAt(path: readonly string[]): string {
    const last = path[path.length - 1] ?? "";
    return this.presentation.at(path)?.label ?? toWords(elementName(last));
  }

  private groupOf(path: readonly string[], children: readonly TreeNode[]): TreeNode | undefined {
    if (children.length === 0) return undefined;
    return { kind: "group", label: this.labelAt(path), children };
  }

  walker(): FieldWalker<Cursor, TreeNode> {
    return {
      enterObject: (field, cursor) => {
        const value = cursor.data[field.name];
        if (!isObject(value)) return "skip";
        return {
          data: value,
          segments: [...cursor.segments, { kind: "key", name: field.name }],
          path: [...cursor.path, field.name],
        };
      },

      enterList: (field, cursor) => {
        const value = cursor.data[field.name];
        if (!Array.isArray(value)) return "skip";
        const isBlocks = field.type === "blocks";
        const segments: PathSegment[] = [...cursor.segments, { kind: "key", name: field.name }];
        const path = [...cursor.path, field.name];

        const children: ChildCursor<Cursor>[] = [];
        value.forEach((item, index) => {
          if (!isObject(item)) return;
          const fields = isBlocks ? resolveBlockFields(field, item) : field.fields;
          if (!fields) return;
          const token =
            isBlocks && typeof item.blockType === "string"
              ? blockElement(item.blockType)
              : ARRAY_ELEMENT;
          children.push({
            cursor: {
              data: item,
              segments: [...segments, elementSegment(item, isBlocks, index)],
              path: [...path, token],
            },
            fields,
            key: index,
          });
        });
        return children;
      },

      leaf: (field, cursor) => {
        if (!isTranslatableLeaf(field)) return undefined;
        if (leafSourceText(field, cursor.data[field.name]) === null) return undefined;

        const path = [...cursor.path, field.name];
        return {
          kind: "leaf",
          label: this.labelAt(path),
          address: makeIdPath([...cursor.segments, { kind: "key", name: field.name }]),
          required: this.presentation.at(path)?.required ?? false,
        };
      },

      combine: (container, children, cursor) => {
        const nodes = children.map((child) => child.out);
        if (container.kind === "root") return { kind: "group", label: "", children: nodes };
        if (container.kind === "object") return this.groupOf(cursor.path, nodes);
        if (container.kind === "element") return this.elementOf(container.key, cursor.path, nodes);
        return this.listOf(container.field, [...cursor.path, container.key], nodes);
      },
    };
  }

  private elementOf(
    key: string | number,
    path: readonly string[],
    children: readonly TreeNode[]
  ): TreeNode | undefined {
    if (children.length === 0) return undefined;
    return { kind: "group", label: `${this.labelAt(path)} ${Number(key) + 1}`, children };
  }

  private listOf(
    field: FieldLike,
    path: readonly string[],
    children: readonly TreeNode[]
  ): TreeNode | undefined {
    if (children.length === 0) return undefined;
    if (field.localized !== true) return this.groupOf(path, children);
    return { kind: "whole-list", label: this.labelAt(path), addresses: addressesOf(children) };
  }
}

/**
 * One node per leaf the *source read* produced, so a field the caller may not read is absent from
 * the tree rather than shown unpickable.
 */
export function documentTree(input: {
  document: Record<string, unknown>;
  schema: FieldLike[];
  presentation: CollectionPresentation;
}): TreeNode[] {
  const builder = new TreeBuilder(input.presentation);
  const root = walkFields<Cursor, TreeNode>(
    input.schema,
    { data: input.document, segments: [], path: [] },
    builder.walker()
  );
  return root !== undefined && root.kind === "group" ? [...root.children] : [];
}
