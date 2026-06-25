// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SeoButton } from "../../src/components/SeoButton";

let docInfo: { id?: string | number } = {};

vi.mock("@payloadcms/ui", () => ({
  useDocumentInfo: () => docInfo,
}));

vi.mock("../../src/components/SeoButton/SeoButtonInner", () => ({
  SeoButtonInner: () => <div data-testid="seo-inner" />,
}));

const props = {
  collectionSlug: "pages",
  fields: {},
  extractContentPath: "@/x#default",
  site: { name: "Site", baseUrl: "https://example.com", faviconUrl: "" },
  supportedLocales: ["en"],
};

afterEach(() => {
  cleanup();
  docInfo = {};
});

describe("SeoButton create-view gate", () => {
  it("renders nothing on the create view (no document id)", () => {
    docInfo = {};
    render(<SeoButton {...props} />);
    expect(screen.queryByTestId("seo-inner")).not.toBeInTheDocument();
  });

  it("mounts the analysis inner for a saved document (id present)", () => {
    docInfo = { id: "65f0a1b2c3d4e5f6a7b8c9d0" };
    render(<SeoButton {...props} />);
    expect(screen.getByTestId("seo-inner")).toBeInTheDocument();
  });

  it("mounts the inner for a numeric document id", () => {
    docInfo = { id: 7 };
    render(<SeoButton {...props} />);
    expect(screen.getByTestId("seo-inner")).toBeInTheDocument();
  });
});
