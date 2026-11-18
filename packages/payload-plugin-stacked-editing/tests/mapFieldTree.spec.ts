import type { Field } from "payload";
import { describe, expect, it } from "vitest";

import { mapFieldTree } from "../src/lib/mapFieldTree.js";

describe("mapFieldTree", () => {
  it("visits arrays, blocks and blocks through every container, children first", () => {
    const visited: string[] = [];
    const fields: Field[] = [
      {
        type: "tabs",
        tabs: [
          {
            label: "Tab",
            fields: [
              {
                type: "row",
                fields: [
                  {
                    name: "layout",
                    type: "blocks",
                    blocks: [
                      { slug: "hero", fields: [{ name: "items", type: "array", fields: [] }] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
    const record = <T>(entry: string, value: T): T => {
      visited.push(entry);
      return value;
    };
    mapFieldTree(fields, {
      array: (field) => record(`array:${field.name}`, field),
      block: (block) => record(`block:${block.slug}`, block),
      blocks: (field) => record(`blocks:${field.name}`, field),
    });
    expect(visited).toEqual(["array:items", "block:hero", "blocks:layout"]);
  });
});
