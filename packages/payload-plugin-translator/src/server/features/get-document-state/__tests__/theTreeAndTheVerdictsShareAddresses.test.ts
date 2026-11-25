/*
 * The picker ticks addresses and the verdict map is keyed by addresses. They are produced by two
 * different walks, so a divergence would show as a leaf nobody can mark or a mark on no leaf.
 */
import { describe, expect, it } from "vitest";

import { translatableFields } from "../../../../core/domain/content-projection/translatableFields.js";
import { projectFieldsToFieldLike } from "../../../../core/kernel/field-traversal/index.js";
import type { TreeNode } from "../../../../types/wire/DocumentTranslationState.js";
import { translationLanguages } from "../../_lib/index.js";
import type { ConfiguredField } from "../collectionPresentation.js";
import { collectionPresentation } from "../collectionPresentation.js";
import { documentTree } from "../documentTree.js";

const addressesOf = (nodes: readonly TreeNode[]): string[] =>
  nodes.flatMap((node) => {
    if (node.kind === "group") return addressesOf(node.children);
    if (node.kind === "whole-list") return [...node.addresses];
    return [node.address];
  });

const declared: ConfiguredField[] = [
  { name: "title", type: "text", localized: true },
  { name: "tagline", type: "text", localized: true },
  {
    name: "seo",
    type: "group",
    localized: true,
    fields: [
      { name: "description", type: "textarea", localized: true },
      { name: "slug", type: "text", localized: true, custom: { translateKit: { exclude: true } } },
    ],
  },
  {
    name: "features",
    type: "array",
    localized: true,
    fields: [{ name: "caption", type: "text", localized: true }],
  },
  { name: "sections", type: "blocks", blockReferences: ["hero"] },
];

const sharedBlocks = [
  { slug: "hero", fields: [{ name: "heading", type: "text", localized: true }] },
];

const document = {
  title: "Hello",
  tagline: "   ",
  seo: { description: "About us", slug: "about-us" },
  features: [{ id: "f1", caption: "One" }],
  sections: [{ id: "b1", blockType: "hero", heading: "Big" }],
};

describe("the addresses the tree offers", () => {
  const schema = projectFieldsToFieldLike(declared, sharedBlocks);

  it("are exactly the ones the content projection names, over a nested, listed and referenced shape", () => {
    const tree = documentTree({
      document,
      schema,
      presentation: collectionPresentation({ fields: declared, sharedBlocks }),
    });
    const projected = translatableFields(document, schema, translationLanguages()).map((field) =>
      String(field.address)
    );

    expect(addressesOf(tree).sort()).toStrictEqual([...projected].sort());
    expect(projected.length).toBeGreaterThan(3);
  });
});
