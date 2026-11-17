import { describe, expect, it } from "vitest";

import { withoutVisualEditing } from "@/lib/utils/withoutVisualEditing";

import { markedField } from "../support/markers";

const META = { collection: "header", id: 1, path: "logo" };

describe("withoutVisualEditing", () => {
  it("removes text markers and every _meta from a draft read", () => {
    const draftRead = {
      logo: { _meta: META, alt: markedField("Logo", "alt"), id: 7 },
      name: markedField("Acme", "name"),
      navItems: [{ id: "a", label: markedField("Blog", "navItems.0.label") }],
    };

    expect(withoutVisualEditing(draftRead)).toEqual({
      logo: { alt: "Logo", id: 7 },
      name: "Acme",
      navItems: [{ id: "a", label: "Blog" }],
    });
  });

  it("returns a published read with the same content and leaves the input unchanged", () => {
    const published = { logo: 3, name: "Acme", navItems: [{ label: "Blog" }] };
    const copy = structuredClone(published);

    expect(withoutVisualEditing(published)).toEqual(copy);
    expect(published).toEqual(copy);
  });
});
