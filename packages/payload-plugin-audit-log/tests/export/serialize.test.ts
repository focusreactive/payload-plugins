import { describe, expect, it } from "vitest";
import { CSV_COLUMNS, csvHeader, csvRows, ndjsonRows } from "../../src/export/serialize";

const row = {
  id: 1,
  occurredAt: "2026-11-04T10:00:00.000Z",
  action: "doc.update",
  status: "success",
  actor: { type: "user", docId: "2", label: 'Ann "A", Admin' },
  via: "admin",
  target: { kind: "collection", slug: "posts", docId: "9", label: "=SUM(A1)" },
  changes: ["title", "seo.title"],
  ip: "203.0.113.7",
  userAgent: "Mozilla/5.0",
};

const toCsv = (rows: unknown[]) => csvHeader() + csvRows(rows);

describe("serialize", () => {
  it("csv has a header and escapes quotes, commas and formulas", () => {
    const [header, line] = toCsv([row]).trimEnd().split("\n");
    expect(header).toBe(CSV_COLUMNS.join(","));
    expect(line).toContain('"Ann ""A"", Admin"');
    expect(line).toContain("'=SUM(A1)");
    expect(line).toContain("title;seo.title");
  });

  it("csv has the client IP and User-Agent columns", () => {
    expect(CSV_COLUMNS).toEqual(expect.arrayContaining(["ip", "userAgent"]));
    const [, line] = toCsv([row]).trimEnd().split("\n");
    expect(line).toContain("203.0.113.7,Mozilla/5.0");
  });

  it.each(["=1+1", "+1", "-1", "@SUM(A1)", "\tcmd", "\rcmd"])("neutralizes %j", (label) => {
    const csv = toCsv([{ ...row, target: { ...row.target, label } }]);
    expect(csv).toMatch(/(^|,)"?'[=+\-@\t\r]/mu);
  });

  it("ndjson is one JSON object per line", () => {
    const ndjson = ndjsonRows([row, row]);
    expect(ndjson.trimEnd().split("\n")).toHaveLength(2);
    expect(JSON.parse(ndjson.split("\n")[0] ?? "")).toEqual(row);
  });
});
