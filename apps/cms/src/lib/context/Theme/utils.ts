import type { Theme } from "@payloadcms/ui";

export function themeIsValid(string: null | string): string is Theme {
  return string ? ["dark", "light"].includes(string) : false;
}
