import type { AbCookieConfig } from "@focus-reactive/payload-plugin-ab";

import { manifestKeyToExpCookieName } from "./cookieName";

export const abCookies: AbCookieConfig = {
  getExpCookieName: manifestKeyToExpCookieName,
  visitorIdCookieName: "ab_visitor_id",
};
