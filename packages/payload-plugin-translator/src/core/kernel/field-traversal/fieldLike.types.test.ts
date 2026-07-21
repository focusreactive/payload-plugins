import type { ArrayField, BlocksField, Field, NamedGroupField, NamedTab, TabsField } from "payload";
import { describe, expect, it } from "vitest";

// TYPE-LEVEL conformance assertions enforced by `tsgo` (check-types over tsconfig.check.json
// includes test files). They guarantee:
//  (1) the adapter side keeps passing real Payload `Field` configs unchanged — Payload's
//      concrete types are assignable to the structural `FieldLike` family; and
//  (2) `LeafFieldLike` stays a true leaf — a container is NOT assignable to it, so leaf
//      dispatch can't silently widen (the hard part of replacing `Exclude<FieldAffectingData,…>`).
import type {
  ArrayFieldLike,
  BlocksFieldLike,
  FieldLike,
  GroupFieldLike,
  LeafFieldLike,
  TabsFieldLike,
} from "./types";

// --- (1) Payload concrete types are assignable to the structural family ---
const payloadField = {} as Field;
const payloadGroup = {} as NamedGroupField;
const payloadArray = {} as ArrayField;
const payloadBlocks = {} as BlocksField;
const payloadTabs = {} as TabsField;
const payloadNamedTab = {} as NamedTab;

const _fieldLike: FieldLike = payloadField;
const _groupLike: GroupFieldLike = payloadGroup;
const _arrayLike: ArrayFieldLike = payloadArray;
const _blocksLike: BlocksFieldLike = payloadBlocks;
const _tabsLike: TabsFieldLike = payloadTabs;

// A Payload leaf (text) is assignable to LeafFieldLike.
const _leafLike: LeafFieldLike = { name: "title", type: "text" };

// --- (2) Negative: containers are NOT assignable to LeafFieldLike ---
// @ts-expect-error a group is a container, not a leaf
const _notLeafGroup: LeafFieldLike = payloadGroup;
// @ts-expect-error an array is a container, not a leaf
const _notLeafArray: LeafFieldLike = payloadArray;
// @ts-expect-error a named tab is not a leaf
const _notLeafTab: LeafFieldLike = payloadNamedTab;

// Touch the bindings so they are not flagged as unused by lint.
void _fieldLike;
void _groupLike;
void _arrayLike;
void _blocksLike;
void _tabsLike;
void _leafLike;
void _notLeafGroup;
void _notLeafArray;
void _notLeafTab;

describe("FieldLike conformance (compile-time, enforced by tsgo)", () => {
  it("compiles: Payload Field family is assignable to FieldLike; containers are not LeafFieldLike", () => {
    // The real assertions are the declarations above; this keeps vitest happy at runtime.
    expect(true).toBe(true);
  });
});
