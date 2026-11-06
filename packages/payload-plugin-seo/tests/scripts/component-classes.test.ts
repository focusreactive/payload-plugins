import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { transformSource } from "../../scripts/prefix-classes";

const linksTabPath = fileURLToPath(
  new URL("../../src/components/SeoDrawer/tabs/LinksTab.tsx", import.meta.url)
);

describe("links tab class constants", () => {
  it("are prefixed by the build", () => {
    const { code } = transformSource(readFileSync(linksTabPath, "utf-8"), linksTabPath);

    expect(code).toContain('"frseo:px-[15px] frseo:py-[12px] frseo:text-[12px]"');
    expect(code).toContain('"frseo:inline-flex frseo:items-center');
  });
});
