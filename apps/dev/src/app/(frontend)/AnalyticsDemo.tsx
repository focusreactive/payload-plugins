"use client";

import { Track, TrackLeadAction } from "@focus-reactive/payload-plugin-analytics/client";

export function AnalyticsDemo() {
  return (
    <div className="links" style={{ marginTop: 24 }}>
      <a className="docs" href="tel:+15551234567" rel="noopener noreferrer">
        Call us (auto-tracked → lead_action / phone_click)
      </a>
      <a className="docs" href="mailto:hello@example.com" rel="noopener noreferrer">
        Email us (auto-tracked → lead_action / email_click)
      </a>
      <Track on="click" event="demo_click" payload={{ label: "demo button" }}>
        <button type="button" className="docs">
          Demo button (custom &lt;Track&gt;)
        </button>
      </Track>
      <TrackLeadAction on="click" type="cta_pricing_click" payload={{ surface: "demo" }}>
        <button type="button" className="docs">
          Pricing CTA (custom &lt;TrackLeadAction&gt;)
        </button>
      </TrackLeadAction>
    </div>
  );
}
