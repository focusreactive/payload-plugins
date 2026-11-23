import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AuditExportButton } from "../../src/components/AuditExportButton";

const { listQuery } = vi.hoisted(() => ({ listQuery: { query: {} as Record<string, unknown> } }));

vi.mock("@payloadcms/ui", () => ({
  Button: ({ url, children }: { url: string; children: ReactNode }) => <a href={url}>{children}</a>,
  useConfig: () => ({ config: { routes: { api: "/custom-api" } } }),
  useListQuery: () => listQuery,
}));

const decodeAttribute = (value: string) => value.replaceAll("&amp;", "&");

const renderedLinks = (element: ReactNode) =>
  [...renderToStaticMarkup(element).matchAll(/<a href="([^"]*)">([^<]*)<\/a>/gu)].map(
    ([, href, label]) => ({ label, url: new URL(decodeAttribute(href ?? ""), "http://cms.test") })
  );

describe("AuditExportButton", () => {
  it("links both formats to the export endpoint under the custom api route and slug, with the list's nested where", () => {
    listQuery.query = {
      where: {
        and: [{ action: { equals: "doc.update" } }, { "actor.type": { in: ["user", "agent"] } }],
      },
    };
    const links = renderedLinks(<AuditExportButton slug="journal" />);
    expect(links.map(({ label }) => label)).toEqual(["Export CSV", "Export NDJSON"]);
    for (const [index, format] of ["csv", "ndjson"].entries()) {
      const url = links[index]?.url ?? new URL("http://missing");
      expect(url.pathname).toBe("/custom-api/journal/export");
      expect([...url.searchParams]).toEqual([
        ["where[and][0][action][equals]", "doc.update"],
        ["where[and][1][actor.type][in][0]", "user"],
        ["where[and][1][actor.type][in][1]", "agent"],
        ["format", format],
      ]);
    }
  });

  it("passes the list's search term so the export matches the rows the list shows", () => {
    listQuery.query = { where: { action: { equals: "doc.update" } }, search: "ann & co" };
    const [csv] = renderedLinks(<AuditExportButton />);
    expect([...(csv?.url.searchParams ?? [])]).toEqual([
      ["where[action][equals]", "doc.update"],
      ["search", "ann & co"],
      ["format", "csv"],
    ]);
  });

  it("leaves out an empty search term", () => {
    listQuery.query = { search: "" };
    const [csv] = renderedLinks(<AuditExportButton />);
    expect([...(csv?.url.searchParams ?? [])]).toEqual([["format", "csv"]]);
  });

  it("uses the default audit slug and only the format when the list has no filter", () => {
    listQuery.query = {};
    const [csv] = renderedLinks(<AuditExportButton />);
    expect(csv?.url.pathname).toBe("/custom-api/audit-events/export");
    expect([...(csv?.url.searchParams ?? [])]).toEqual([["format", "csv"]]);
  });
});
