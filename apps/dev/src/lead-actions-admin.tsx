"use client";

import { createLeadActionRegistry } from "@focus-reactive/payload-plugin-analytics/client";
import { MousePointerClick, Zap } from "lucide-react";

export default createLeadActionRegistry({
  cta_pricing_click: { icon: Zap, label: "Pricing CTA" },
  hero_cta_click: { icon: MousePointerClick, label: "Hero CTA" },
});
