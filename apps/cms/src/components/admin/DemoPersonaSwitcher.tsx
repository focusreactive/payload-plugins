import type { Payload, TypedUser } from "payload";
import React from "react";

import { findDemoPersonas } from "@/lib/auth/demoPersonas";
import type { DemoPersona } from "@/lib/auth/demoPersonas";

const ROLE_LABELS: Record<DemoPersona["user"]["role"], string> = {
  administrator: "Administrator",
  feeEarner: "Fee-earner",
  globalEditor: "Global editor",
  marketEditor: "Market editor",
};

const personaHref = (persona: DemoPersona) => `/api/demo/view-as?persona=${persona.slug}`;

export async function DemoPersonaLoginButtons({ payload }: { payload: Payload }) {
  const personas = await findDemoPersonas(payload);
  if (personas.length === 0) {
    return null;
  }
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ color: "var(--theme-text)", fontSize: 12, marginBottom: 8, opacity: 0.7 }}>
        Demo: sign in as
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {personas.map((persona) => (
          <a
            key={persona.slug}
            href={personaHref(persona)}
            style={{
              border: "1px solid var(--theme-elevation-150)",
              borderRadius: "var(--border-radius-m)",
              color: "var(--theme-text)",
              display: "block",
              padding: "10px 14px",
              textDecoration: "none",
            }}
          >
            <strong>{ROLE_LABELS[persona.user.role]}</strong>
            <span style={{ marginLeft: 8, opacity: 0.7 }}>{persona.user.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export async function DemoPersonaHeaderSwitch({
  payload,
  user,
}: {
  payload: Payload;
  user?: TypedUser | null;
}) {
  const personas = await findDemoPersonas(payload);
  if (personas.length === 0) {
    return null;
  }
  const currentEmail = user && "email" in user ? user.email : undefined;
  return (
    <details style={{ position: "relative" }}>
      <summary style={{ cursor: "pointer", fontSize: 13, listStyle: "none", whiteSpace: "nowrap" }}>
        View as ▾
      </summary>
      <div
        style={{
          background: "var(--theme-elevation-0)",
          border: "1px solid var(--theme-elevation-150)",
          borderRadius: "var(--border-radius-m)",
          display: "grid",
          minWidth: 240,
          padding: 4,
          position: "absolute",
          right: 0,
          top: "calc(100% + 6px)",
          zIndex: 50,
        }}
      >
        {personas.map((persona) => {
          const isCurrent = persona.user.email === currentEmail;
          return (
            <a
              key={persona.slug}
              aria-current={isCurrent ? "true" : undefined}
              href={personaHref(persona)}
              style={{
                background: isCurrent ? "var(--theme-elevation-100)" : undefined,
                borderRadius: "var(--border-radius-s)",
                color: "var(--theme-text)",
                fontSize: 13,
                padding: "8px 10px",
                textDecoration: "none",
              }}
            >
              <strong>{ROLE_LABELS[persona.user.role]}</strong>
              <span style={{ display: "block", opacity: 0.7 }}>{persona.user.name}</span>
            </a>
          );
        })}
      </div>
    </details>
  );
}
