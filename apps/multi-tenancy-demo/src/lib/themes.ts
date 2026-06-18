import type { CSSProperties } from "react";

// Per-tenant theming, keyed by tenant slug. Kept in the frontend (rather than as
// tenant fields) so the demo stays schema-minimal — the brand colors are derived
// from each company's app icon. Each theme is projected into CSS custom
// properties on a wrapper element; styles.css reads them via var().

export interface Theme {
  /** Display label used in the chrome and as a fallback hero title. */
  label: string;
  /** One-liner shown on the home page card. */
  blurb: string;
  /** Brand logo served from /public; falls back to a letter mark when absent. */
  logo?: string;
  vars: {
    bg: string;
    surface: string;
    fg: string;
    muted: string;
    border: string;
    accent: string;
    accentTo: string;
    logoBg: string;
    logoFg: string;
  };
}

// OpenAI — crisp white surface with the Codex blue→violet gradient accent.
const openai: Theme = {
  label: "OpenAI",
  blurb: "Creating safe AGI that benefits all of humanity.",
  logo: "/openai.svg",
  vars: {
    bg: "#ffffff",
    surface: "#f7f7f8",
    fg: "#0d0d0d",
    muted: "#6e6e80",
    border: "#e6e6ea",
    accent: "#4b73ff",
    accentTo: "#9168ff",
    logoBg: "#0d0d0d",
    logoFg: "#ffffff",
  },
};

// Anthropic — signature cream canvas with the Claude coral/orange accent.
const anthropic: Theme = {
  label: "Anthropic",
  blurb: "AI research and products that put safety at the frontier.",
  logo: "/anthropic.svg",
  vars: {
    bg: "#f0eee6",
    surface: "#faf9f5",
    fg: "#141413",
    muted: "#6b6862",
    border: "#e3ddcd",
    accent: "#d97757",
    accentTo: "#cc785c",
    logoBg: "#d97757",
    logoFg: "#ffffff",
  },
};

// Neutral chrome for the tenant-picker home page.
const neutral: Theme = {
  label: "Multi-Tenancy Demo",
  blurb: "Pick a tenant to preview its isolated content.",
  vars: {
    bg: "#fafafa",
    surface: "#ffffff",
    fg: "#111111",
    muted: "#666666",
    border: "#e2e2e2",
    accent: "#6366f1",
    accentTo: "#8b5cf6",
    logoBg: "#111111",
    logoFg: "#ffffff",
  },
};

const THEMES: Record<string, Theme> = { openai, anthropic };

export const getTheme = (slug?: string): Theme => (slug && THEMES[slug]) || neutral;

export const neutralTheme = neutral;

// Project a theme's palette into the CSS custom properties styles.css consumes.
export const themeStyle = (theme: Theme): CSSProperties =>
  ({
    "--bg": theme.vars.bg,
    "--surface": theme.vars.surface,
    "--fg": theme.vars.fg,
    "--muted": theme.vars.muted,
    "--border": theme.vars.border,
    "--accent": theme.vars.accent,
    "--accent-to": theme.vars.accentTo,
    "--logo-bg": theme.vars.logoBg,
    "--logo-fg": theme.vars.logoFg,
  }) as CSSProperties;
