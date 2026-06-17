import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { pushPageView } from "../../../src/providers/ga4Provider/pushPageView";
import { setPageContext, clearPageContext } from "../../../src/client/pageContext/store";

describe("pushPageView page-context stamping", () => {
  beforeEach(() => {
    clearPageContext();
    (globalThis as { gtag?: unknown }).gtag = vi.fn();
  });
  afterEach(() => {
    clearPageContext();
    delete (globalThis as { gtag?: unknown }).gtag;
  });

  it("stamps fr_page_ref and fr_content_locale when context is set", () => {
    setPageContext({ pageRef: "page:42", locale: "en" });
    pushPageView("/about", "About", "https://x/about");
    const gtag = (globalThis as { gtag: ReturnType<typeof vi.fn> }).gtag;
    const params = gtag.mock.calls[0][2];
    expect(params.fr_page_ref).toBe("page:42");
    expect(params.fr_content_locale).toBe("en");
    expect(params.page_path).toBe("/about");
  });

  it("omits page params when no context is set", () => {
    pushPageView("/about", "About", "https://x/about");
    const gtag = (globalThis as { gtag: ReturnType<typeof vi.fn> }).gtag;
    const params = gtag.mock.calls[0][2];
    expect(params.fr_page_ref).toBeUndefined();
    expect(params.fr_content_locale).toBeUndefined();
  });
});
