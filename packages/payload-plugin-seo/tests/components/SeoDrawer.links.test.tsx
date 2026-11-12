// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SeoDrawer } from "../../src/components/SeoDrawer";

vi.mock("@payloadcms/ui", () => ({
  Drawer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useConfig: () => ({ config: { routes: { api: "/api", admin: "/admin" } } }),
  useModal: () => ({ closeModal: () => undefined }),
  XIcon: () => null,
}));

afterEach(() => cleanup());

const noop = () => undefined;
const find = vi.fn(async () => undefined);

const suggestion = {
  collection: "posts",
  id: "2",
  title: "Post two",
  phrase: "payload cms",
  count: 1,
  snippet: "Payload CMS",
  snippetMatch: { start: 0, end: 11 },
  url: "/blog/two",
};

const props = {
  drawerSlug: "seo",
  keyphrases: [],
  selectedId: null,
  onSelect: noop,
  result: null,
  analyzing: true,
  onAddRelated: noop,
  onTextChange: noop,
  onAddSynonym: noop,
  onRemoveSynonym: noop,
  onRemove: noop,
  onSetFocus: noop,
  isDuplicate: () => false,
  site: { name: "Site", baseUrl: "https://example.com", faviconUrl: "" },
};

describe("SeoDrawer internal links tab", () => {
  it("is hidden without the keyphrase index", () => {
    render(<SeoDrawer {...props} />);

    expect(screen.queryByRole("tab", { name: /internal links/iu })).toBeNull();
  });

  it("renders the links tab without waiting for the analysis", () => {
    render(<SeoDrawer {...props} links={{ state: { status: "idle" }, find }} />);

    fireEvent.click(screen.getByRole("tab", { name: /internal links/iu }));
    fireEvent.click(screen.getByRole("button", { name: /find opportunities/iu }));

    expect(find).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/analyzing/iu)).toBeNull();
  });

  it("keeps the found suggestions when switching tabs", () => {
    render(
      <SeoDrawer
        {...props}
        links={{ state: { status: "done", suggestions: [suggestion] }, find }}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: /internal links/iu }));
    expect(screen.getByRole("link", { name: "Post two" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /keyphrase/iu }));
    expect(screen.queryByRole("link", { name: "Post two" })).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /internal links/iu }));
    expect(screen.getByRole("link", { name: "Post two" })).toBeInTheDocument();
  });
});
