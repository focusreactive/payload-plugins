import type { LeafVerdict } from "../../../../types/wire/DocumentTranslationState.js";
import type { LeafAddress } from "../../../../types/wire/primitives.js";
import { leavesOf } from "../model/index.js";
import type { StubFixture } from "../model/index.js";

/** Every stubbed document has this one shape, whatever its collection. */
export const FIXTURE_DOCUMENT: StubFixture = {
  tree: [
    { kind: "leaf", label: "Title", address: "title", required: true },
    { kind: "leaf", label: "Summary", address: "summary", required: false },
    {
      kind: "group",
      label: "Sections",
      children: [
        {
          kind: "group",
          label: "Hero",
          children: [
            { kind: "leaf", label: "Heading", address: "sections.b1.heading", required: false },
            { kind: "leaf", label: "Lead", address: "sections.b1.lead", required: false },
          ],
        },
        {
          kind: "group",
          label: "Text",
          children: [{ kind: "leaf", label: "Body", address: "sections.b2.body", required: false }],
        },
      ],
    },
    { kind: "whole-list", label: "Sidebar", addresses: ["sidebar.s1.text", "sidebar.s2.text"] },
    { kind: "leaf", label: "Meta description", address: "meta.description", required: false },
  ],
  excluded: ["Slug"],
};

const DRIFT: Readonly<Record<LeafAddress, LeafVerdict>> = {
  summary: "drifted",
  "sections.b2.body": "unanswered",
  "meta.description": "unanswered",
};

export function currentVerdicts(): Record<LeafAddress, LeafVerdict> {
  return Object.fromEntries(
    leavesOf(FIXTURE_DOCUMENT.tree).map((address): [LeafAddress, LeafVerdict] => [
      address,
      "current",
    ])
  );
}

export function driftedVerdicts(): Record<LeafAddress, LeafVerdict> {
  return { ...currentVerdicts(), ...DRIFT };
}
