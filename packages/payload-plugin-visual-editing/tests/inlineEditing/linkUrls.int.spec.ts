import { describe, expect, it } from "vitest";

import { isAllowedLinkUrl } from "../../src/shared/richText/linkUrls";

const SCRIPT = "javascript";

describe("the address of a link written on the page", () => {
  it.each([
    "https://example.com/docs",
    "http://example.com",
    "HTTPS://EXAMPLE.COM",
    "mailto:ada@example.com",
    "tel:+375291234567",
    "/about",
    "about/team",
    "../up",
    "#section",
    "?page=2",
    "//cdn.example.com/file",
  ])("may be %s", (url) => {
    expect(isAllowedLinkUrl(url)).toBe(true);
  });

  it.each([
    "",
    "   ",
    `${SCRIPT}:alert(1)`,
    ` ${SCRIPT}:alert(1)`,
    "JAVA\tSCRIPT:alert(1)",
    "java\nscript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "ftp://files.example.com",
    "file:///etc/passwd",
    "blob:https://example.com/id",
  ])("may not be %j", (url) => {
    expect(isAllowedLinkUrl(url)).toBe(false);
  });
});
