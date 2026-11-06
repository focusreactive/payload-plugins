// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readContent } from "../../../src/components/SeoDrawer/links/readContent";
import {
  MAX_LINKED_HREFS,
  MAX_LINKED_HREF_LENGTH,
  MAX_LINK_TEXT_CHARS,
} from "../../../src/constants";

describe("readContent", () => {
  it("returns visible text and every href", () => {
    const html =
      '<h2>Intro</h2><p>Read <a href="/blog/a">post A</a> and <a href="https://x.com/b/">B</a>.</p><p>Done</p>';

    expect(readContent(html)).toEqual({
      text: "Intro Read post A and B. Done",
      hrefs: ["/blog/a", "https://x.com/b/"],
    });
  });

  it("separates list items, nested blocks and line breaks", () => {
    expect(readContent("<ul><li>Payload</li><li>CMS</li></ul>").text).toBe("Payload CMS");
    expect(readContent("<div><p>Payload</p><p>CMS guide</p></div>").text).toBe("Payload CMS guide");
    expect(readContent("<p>Payload<br>CMS</p>").text).toBe("Payload CMS");
  });

  it("handles empty content", () => {
    expect(readContent("")).toEqual({ text: "", hrefs: [] });
  });

  it("dedupes hrefs and drops empty ones", () => {
    const html = '<p><a href="/a">a</a> <a href="/a">again</a> <a href="">none</a></p>';

    expect(readContent(html).hrefs).toEqual(["/a"]);
  });

  it("keeps the request within the server caps", () => {
    const longHref = `/${"x".repeat(MAX_LINKED_HREF_LENGTH)}`;
    const links = Array.from(
      { length: MAX_LINKED_HREFS + 1 },
      (_, i) => `<a href="/p/${i}">p</a>`
    ).join(" ");
    const html = `<p>${"word ".repeat(MAX_LINK_TEXT_CHARS)}</p><p><a href="${longHref}">long</a> ${links}</p>`;

    const { text, hrefs } = readContent(html);

    expect(text).toHaveLength(MAX_LINK_TEXT_CHARS);
    expect(hrefs).toHaveLength(MAX_LINKED_HREFS);
    expect(hrefs).not.toContain(longHref);
  });
});
