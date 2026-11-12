import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { transformSource } from "../../scripts/prefix-classes";

function transformed(relativePath: string): string {
  const path = fileURLToPath(new URL(relativePath, import.meta.url));

  return transformSource(readFileSync(path, "utf-8"), path).code;
}

describe("class constants", () => {
  it("are prefixed by the build", () => {
    expect(transformed("../../src/components/SeoDrawer/tabs/LinksTab.tsx")).toContain(
      '"frseo:px-[15px] frseo:py-[12px] frseo:text-[12px]"'
    );
    expect(transformed("../../src/utils/style.ts")).toContain(
      '"frseo:inline-flex frseo:items-center'
    );
  });
});
