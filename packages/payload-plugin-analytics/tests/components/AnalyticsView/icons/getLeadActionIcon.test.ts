import { describe, expect, it } from "vitest";
import { Phone, Mail, Navigation, MessageCircle, Send, ExternalLink, CalendarCheck, FormInput, Zap } from "lucide-react";
import { getLeadActionIcon } from "../../../../src/components/AnalyticsView/icons/getLeadActionIcon";

describe("getLeadActionIcon", () => {
  it.each([
    ["phone_click", Phone],
    ["email_click", Mail],
    ["directions_click", Navigation],
    ["whatsapp_click", MessageCircle],
    ["telegram_click", Send],
    ["website_click", ExternalLink],
    ["booking_click", CalendarCheck],
    ["form_submit", FormInput],
  ])("maps %s", (kind, icon) => {
    expect(getLeadActionIcon(kind as any)).toBe(icon);
  });

  it("falls back to Zap for unknown kinds", () => {
    expect(getLeadActionIcon("nope" as any)).toBe(Zap);
  });
});
