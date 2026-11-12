// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LinkSuggestionsState } from "../../src/components/SeoDrawer/links/useLinkSuggestions";
import { LinksTab } from "../../src/components/SeoDrawer/tabs/LinksTab";

vi.mock("@payloadcms/ui", () => ({
  useConfig: () => ({ config: { routes: { api: "/api", admin: "/admin" } } }),
}));

const find = vi.fn(async () => undefined);
const writeText = vi.fn(async (_text: string) => undefined);

beforeEach(() => {
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  find.mockClear();
  writeText.mockReset();
});

const suggestion = {
  collection: "posts",
  id: "2",
  title: "Post two",
  phrase: "payload cms",
  count: 2,
  snippet: "… we use payload cms …",
  snippetMatch: { start: 9, end: 20 },
  url: "/blog/post-two",
};

function renderTab(state: LinkSuggestionsState) {
  return render(<LinksTab onFind={find} state={state} />);
}

describe("LinksTab", () => {
  it("asks for suggestions on click", () => {
    renderTab({ status: "idle" });

    fireEvent.click(screen.getByRole("button", { name: /find opportunities/iu }));

    expect(find).toHaveBeenCalledTimes(1);
  });

  it("keeps the button focusable but marked disabled while loading", () => {
    renderTab({ status: "loading" });

    const button = screen.getByRole("button", { name: /find opportunities/iu });
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("aria-disabled", "true");

    const region = screen.getByText(/looking for opportunities/iu).closest("[aria-live]");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-busy", "true");
  });

  it("lists suggestions with a new-tab admin link and the match count", () => {
    renderTab({ status: "done", suggestions: [suggestion, { ...suggestion, id: "3", count: 1 }] });

    const [link] = screen.getAllByRole("link", { name: "Post two" });
    expect(link).toHaveAttribute("href", "/admin/collections/posts/2");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getAllByText("/blog/post-two")).toHaveLength(2);
    expect(screen.getAllByText("“payload cms”")).toHaveLength(2);
    expect(screen.getByText("2 matches")).toBeInTheDocument();
    expect(screen.getByText("1 match")).toBeInTheDocument();
    expect(
      screen.getAllByText((_, el) => el?.textContent === suggestion.snippet && el.tagName === "P")
    ).toHaveLength(2);
  });

  it("highlights exactly the matched text in the snippet", () => {
    renderTab({
      status: "done",
      suggestions: [
        {
          ...suggestion,
          phrase: "art",
          snippet: "… start the art …",
          snippetMatch: { start: 12, end: 15 },
        },
      ],
    });

    const highlighted = screen.getAllByText("art").filter((el) => el.tagName === "STRONG");
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].parentElement).toHaveTextContent("… start the art …");
    expect(document.querySelectorAll("p strong")).toHaveLength(1);
  });

  it("copies the url and resets the feedback after a delay", async () => {
    vi.useFakeTimers();
    renderTab({ status: "done", suggestions: [suggestion] });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /copy link/iu }));
    });

    expect(writeText).toHaveBeenCalledWith("/blog/post-two");
    expect(screen.getByRole("button", { name: /copied/iu })).toBeInTheDocument();

    act(() => {
      vi.runOnlyPendingTimers();
    });
    expect(screen.getByRole("button", { name: /copy link/iu })).toBeInTheDocument();
  });

  it("reports a failed copy", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    renderTab({ status: "done", suggestions: [suggestion] });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /copy link/iu }));
    });

    expect(screen.getByRole("button", { name: /copy failed/iu })).toBeInTheDocument();
  });

  it("explains a missing url and hides Copy", () => {
    renderTab({ status: "done", suggestions: [{ ...suggestion, url: null }] });

    expect(screen.getByText(/no public url configured/iu)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy link/iu })).toBeNull();
  });

  it("shows empty and error states", () => {
    const { rerender } = renderTab({ status: "done", suggestions: [] });
    expect(screen.getByText(/no opportunities found/iu)).toBeInTheDocument();

    rerender(<LinksTab onFind={find} state={{ status: "error" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/could not load suggestions/iu);
  });
});
