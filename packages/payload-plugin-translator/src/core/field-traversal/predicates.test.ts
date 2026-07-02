import type { Field, Tab } from "payload";
import {
  fieldAffectsData as payloadFieldAffectsData,
  fieldIsArrayType as payloadFieldIsArrayType,
  fieldIsBlockType as payloadFieldIsBlockType,
  fieldIsGroupType as payloadFieldIsGroupType,
  tabHasName as payloadTabHasName,
} from "payload/shared";
import { describe, expect, it } from "vitest";

// Parity guard: the framework-agnostic re-implementations of Payload's field predicates MUST
// agree with `payload/shared` on every field type — otherwise the classification dispatch in
// kernel.ts silently shifts. This is what justifies deleting the `payload/shared` import.
import {
  fieldAffectsData,
  fieldIsArrayType,
  fieldIsBlockType,
  fieldIsGroupType,
  tabHasName,
} from "./predicates";

/** One representative field per Payload type the classifier can encounter. */
const FIELD_FIXTURES: Field[] = [
  { name: "title", type: "text" },
  { name: "body", type: "textarea" },
  { name: "rich", type: "richText" },
  { name: "count", type: "number" },
  { name: "rel", type: "relationship", relationTo: "posts" },
  { name: "media", type: "upload", relationTo: "media" },
  { name: "pick", type: "select", options: ["a", "b"] },
  { name: "items", type: "array", fields: [{ name: "label", type: "text" }] },
  { name: "sections", type: "blocks", blocks: [] },
  { name: "meta", type: "group", fields: [{ name: "slug", type: "text" }] },
  // unnamed presentational containers (no `name`) — exercise the `fieldAffectsData` gate
  { type: "row", fields: [{ name: "a", type: "text" }] } as unknown as Field,
  { type: "collapsible", label: "More", fields: [{ name: "c", type: "text" }] } as unknown as Field,
  { type: "ui", name: "preview", admin: { components: {} } } as unknown as Field,
  { type: "tabs", tabs: [{ name: "t", fields: [] }] } as unknown as Field,
];

const TAB_FIXTURES: Tab[] = [
  { name: "named", fields: [] } as unknown as Tab,
  { label: "Unnamed", fields: [] } as unknown as Tab,
];

describe("field predicates — parity with payload/shared", () => {
  it.each(FIELD_FIXTURES.map((f) => [f.type, f] as const))(
    "fieldAffectsData matches payload/shared for `%s`",
    (_type, field) => {
      expect(fieldAffectsData(field)).toBe(payloadFieldAffectsData(field));
    }
  );

  it.each(FIELD_FIXTURES.map((f) => [f.type, f] as const))(
    "fieldIsArrayType matches payload/shared for `%s`",
    (_type, field) => {
      expect(fieldIsArrayType(field)).toBe(payloadFieldIsArrayType(field));
    }
  );

  it.each(FIELD_FIXTURES.map((f) => [f.type, f] as const))(
    "fieldIsBlockType matches payload/shared for `%s`",
    (_type, field) => {
      expect(fieldIsBlockType(field)).toBe(payloadFieldIsBlockType(field));
    }
  );

  it.each(FIELD_FIXTURES.map((f) => [f.type, f] as const))(
    "fieldIsGroupType matches payload/shared for `%s`",
    (_type, field) => {
      expect(fieldIsGroupType(field)).toBe(payloadFieldIsGroupType(field));
    }
  );

  it.each(TAB_FIXTURES.map((t, i) => [i, t] as const))(
    "tabHasName matches payload/shared for tab #%s",
    (_i, tab) => {
      expect(tabHasName(tab)).toBe(payloadTabHasName(tab));
    }
  );
});
