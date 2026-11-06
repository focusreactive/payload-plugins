// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LinkSuggestionsProvider,
  renderLinksPanel,
} from "../../../src/components/SeoDrawer/links/LinkSuggestionsProvider";
import type { AnalysisInput } from "../../../src/engine/types/analysis";

vi.mock("@payloadcms/ui", () => ({
  useConfig: () => ({ config: { routes: { api: "/api", admin: "/admin" } } }),
  useForm: () => ({ getData: () => ({}) }),
}));

const fetchMock = vi.fn();
const getInput = async (): Promise<AnalysisInput> =>
  ({ contentHtml: "<p>Payload CMS</p>" }) as AnalysisInput;

const options = { collectionSlug: "posts", docId: "1", localeCode: "en", getInput };

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

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Drawer({ showLinks }: { showLinks: boolean }) {
  return showLinks ? renderLinksPanel() : <div>other tab</div>;
}

describe("LinkSuggestionsProvider", () => {
  it("renders no links panel outside the provider", () => {
    const { container } = render(renderLinksPanel());
    expect(container).toBeEmptyDOMElement();
  });

  it("keeps found suggestions when the links panel unmounts and mounts again", async () => {
    fetchMock.mockResolvedValue(Response.json({ suggestions: [suggestion] }));
    const view = (showLinks: boolean) => (
      <LinkSuggestionsProvider {...options}>
        <Drawer showLinks={showLinks} />
      </LinkSuggestionsProvider>
    );
    const { rerender } = render(view(true));

    fireEvent.click(screen.getByRole("button", { name: /find opportunities/iu }));
    expect(await screen.findByRole("link", { name: "Post two" })).toBeInTheDocument();

    rerender(view(false));
    expect(screen.queryByRole("link", { name: "Post two" })).toBeNull();

    rerender(view(true));
    expect(screen.getByRole("link", { name: "Post two" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
