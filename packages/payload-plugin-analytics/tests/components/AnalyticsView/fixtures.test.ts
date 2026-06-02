import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const DIR = resolve(__dirname, "../../../__fixtures__/admin");

describe("admin fixtures", () => {
  it("every JSON file in __fixtures__/admin parses", () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) {
      const raw = readFileSync(resolve(DIR, f), "utf-8");
      expect(() => JSON.parse(raw)).not.toThrow();
    }
  });
});
