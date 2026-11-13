import { describe, expect, it } from "vitest";
import type { Field } from "payload";
import { resolveFieldPath } from "../../src/services/fieldLabels/utils/resolveFieldPath";

const fields: Field[] = [
  { name: "title", type: "text", label: "Title" },
  {
    type: "tabs",
    tabs: [
      { label: "Content", fields: [{ name: "body", type: "textarea", label: "Body" }] },
      {
        name: "meta",
        label: "SEO",
        fields: [{ name: "title", type: "text", label: { en: "Meta title" } }],
      },
    ],
  },
];

const labels = (path: string) =>
  resolveFieldPath(path.split("."), fields, {}).map((s) => (s.type === "field" ? s.label : "#"));

describe("resolveFieldPath", () => {
  it("labels a field inside a named tab with the tab and field labels", () => {
    expect(labels("meta.title")).toEqual(["SEO", "Meta title"]);
  });

  it("keeps fields of an unnamed tab at the top level", () => {
    expect(labels("body")).toEqual(["Body"]);
  });
});
