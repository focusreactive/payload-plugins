// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SeoDrawer } from "../../src/components/SeoDrawer";

vi.mock("@payloadcms/ui", () => ({
  Drawer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useModal: () => ({ closeModal: () => undefined }),
  XIcon: () => null,
}));

afterEach(() => cleanup());

const noop = () => undefined;

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

  it("renders the links panel without waiting for the analysis", () => {
    render(<SeoDrawer {...props} renderLinks={() => <div>links panel</div>} />);

    fireEvent.click(screen.getByRole("tab", { name: /internal links/iu }));

    expect(screen.getByText("links panel")).toBeInTheDocument();
    expect(screen.queryByText(/analyzing/iu)).toBeNull();
  });
});
