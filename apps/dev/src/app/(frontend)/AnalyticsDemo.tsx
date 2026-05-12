'use client'

import { Track } from '@focus-reactive/payload-plugin-analytics/client'

export function AnalyticsDemo() {
  return (
    <div className="links" style={{ marginTop: 24 }}>
      <a className="docs" href="tel:+15551234567" rel="noopener noreferrer">
        Call us (auto-tracked phone_click)
      </a>
      <a className="docs" href="mailto:hello@example.com" rel="noopener noreferrer">
        Email us (auto-tracked email_click)
      </a>
      <Track on="click" event="demo_click" payload={{ label: 'demo button' }}>
        <button type="button" className="docs">
          Demo button (custom &lt;Track&gt;)
        </button>
      </Track>
    </div>
  )
}
