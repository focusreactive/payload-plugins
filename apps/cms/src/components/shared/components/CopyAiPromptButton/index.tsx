"use client";

import { Button } from "@payloadcms/ui";
import { useState } from "react";

/**
 * Design-system values resolved from `packages/tailwind-config/base.css`
 * (the default / light theme — Tier 1 primitives substituted into the Tier 2
 * semantic roles). Keep these in sync with that file — it is the source of truth.
 *
 * We inline LITERAL values into the prompt rather than `var(--token)` references
 * on purpose: the generated fragment is often previewed standalone (e.g. inside a
 * cloud AI chat) where our CSS custom properties don't exist, so `var(...)` would
 * render with no color/font and you'd never see a real preview. Literal values
 * render correctly anywhere.
 */
const THEME = {
  colors: {
    background: "#eef2f3",
    foreground: "#0a1314",
    surface: "#ffffff",
    surfaceMuted: "#dde6e7",
    card: "#ffffff",
    cardForeground: "#0a1314",
    muted: "#dde6e7",
    mutedForeground: "#5a6a6b",
    primary: "#0d9488",
    primaryForeground: "#ffffff",
    primaryHover: "#0a7268",
    secondary: "#0a1314",
    secondaryForeground: "#ffffff",
    accent: "#d8ff3a",
    accentForeground: "#0a1314",
    border: "rgba(10, 19, 20, 0.12)",
    borderStrong: "rgba(10, 19, 20, 0.22)",
    ring: "#0d9488",
  },
  fonts: {
    display: "'Newsreader', Georgia, 'Times New Roman', serif",
    sans: "'Archivo', system-ui, -apple-system, sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace",
  },
  radii: { sm: "8px", md: "16px", lg: "28px", pill: "999px" },
} as const;

const c = THEME.colors;
const f = THEME.fonts;
const r = THEME.radii;

/**
 * Prompt handed to an AI assistant so it generates markup that matches this
 * project's design system.
 */
const AI_PROMPT = `You are generating a single, self-contained block of HTML + CSS to paste into a "Raw HTML" page section of our website. The fragment is injected with dangerouslySetInnerHTML inside a themed section container.

IMPORTANT: Do NOT use Tailwind. Tailwind on this site is precompiled, so arbitrary Tailwind utility classes will NOT work in this injected fragment. You MUST write all styles as plain CSS inside a <style> tag — use regular class names and a single <style> tag containing the CSS rules. No Tailwind classes anywhere.

OUTPUT
- Return ONE HTML fragment: first the markup, then a single <style> tag at the end containing all your CSS. Nothing else — no <html>, <head>, <body>, external CSS/JS files, markdown fences, or commentary.
- The fragment must have exactly ONE root element, and it MUST be a <div>. Do NOT use <section>, <main>, <article>, <header>, or <footer> as the root — this fragment is already rendered inside a <section> landmark, so a second one would nest landmarks. (You may use semantic tags like <article>/<header> for inner content, just not as the root.)
- Give that single root <div> one unique class (e.g. <div class="rawhtml-xyz">) and scope EVERY CSS selector under it (e.g. .rawhtml-xyz .title { ... }) so the styles cannot leak into the rest of the page.
- Make it responsive (mobile-first) and accessible (semantic tags, alt text, aria where needed).

SCRIPTS — allowed ONLY for visual polish, never for logic. You MAY include a single small inline <script> AND ONLY to drive purely cosmetic animations and effects (e.g. scroll/intersection-observer reveals, hover motion, simple auto-rotating carousels, count-up numbers). Keep it tiny, self-contained, and scope all DOM queries to your root wrapper class.
- The content MUST be fully visible and usable WITHOUT JavaScript. A script may only enhance appearance — it must never gate visibility or be required to read the content (the script does not always run, e.g. on client-side navigation).

FORBIDDEN — never include any of the following. If a brief seems to require them, render static placeholder markup instead and do the visual part only:
- Any real logic or data handling in scripts: NO network or API calls of any kind (fetch, XMLHttpRequest, WebSocket, sendBeacon, EventSource), NO reading or writing cookies, localStorage, sessionStorage, or IndexedDB, NO forms that submit or post data, NO reading user input/PII, NO tracking or analytics, NO navigation/redirects, NO eval / new Function / dynamic <script> injection, NO loading external scripts, styles, fonts, or <iframe>s, NO timers that mutate data.
- Tailwind or any utility-class framework; CSS var(--token) references — use the literal values listed under THEME VALUES, not variables.
- Outer max-width, background, theme, or outer margins / section padding on the root (the section owns all of that).
- <html>/<head>/<body>, external CSS/JS files, markdown fences, or commentary.

THEME VALUES — use these EXACT literal values directly in your CSS. Do NOT use CSS var(...) references and do NOT invent other colors — write these real values so the section renders correctly even when previewed on its own. These are our design-system colors; stick to them:
- Surfaces/text: background ${c.background}, foreground/text ${c.foreground}, surface ${c.surface}, surface-muted ${c.surfaceMuted}, card ${c.card}, card text ${c.cardForeground}, muted ${c.muted}, muted text ${c.mutedForeground}
- Brand/actions: primary ${c.primary}, text-on-primary ${c.primaryForeground}, primary hover ${c.primaryHover}, secondary ${c.secondary}, text-on-secondary ${c.secondaryForeground}, accent ${c.accent}, text-on-accent ${c.accentForeground}
- Borders/rings: border ${c.border}, border-strong ${c.borderStrong}, focus ring ${c.ring}
- Fonts: headings/display → ${f.display}; body → ${f.sans}; code/labels/eyebrow → ${f.mono}
- Radii: small ${r.sm}, medium ${r.md}, large ${r.lg}, pill ${r.pill}

TYPOGRAPHY SCALE — match these sizes so headings/body align with the rest of the site:
- Display 1: font-display, clamp(2.8rem, 7vw, 5.4rem), line-height 0.98, letter-spacing -0.02em
- Display 2: font-display, clamp(2.2rem, 5vw, 3.6rem), line-height 1.02
- Section heading: font-display, clamp(1.9rem, 4vw, 3rem), line-height 1.05
- Card heading: font-display, 1.5rem, line-height 1.1
- Lead: clamp(1.1rem, 1.6vw, 1.32rem), line-height 1.55
- Body: 1.0625rem, line-height 1.7
- Small: 0.9375rem, line-height 1.55
- Eyebrow/kicker: font-mono, 0.72rem, letter-spacing 0.16em, text-transform uppercase

SPACING & LAYOUT — this fragment is dropped inside a section that the CMS already controls. The section sets the theme (light/dark), the max content width and horizontal padding, the vertical section padding (top/bottom), and any background. Treat your fragment as pure inner content:
- The root element must be full width (width: 100%). Do NOT add an outer max-width, do NOT center the whole fragment, and do NOT add a background color or set a theme — the section owns all of that.
- Do NOT add outer margins or top/bottom section padding. No margin/padding on the root that pushes it away from the section edges — the section's padding is the only outer spacing, and it is editor-controlled like every other section.
- DO use comfortable internal spacing between your own elements and inside cards to match the site's generous rhythm. Just keep all spacing internal.

Now generate the section for this brief: [describe the section you want here].`;

export const CopyAiPromptButton: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(AI_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="field-type">
      <Button
        buttonStyle="primary"
        extraButtonProps={{ style: { width: "100%" } }}
        margin={false}
        onClick={handleCopy}
        type="button"
      >
        {copied ? "Copied ✓" : "Copy AI Prompt"}
      </Button>
      <p className="field-description" style={{ marginTop: "0.5rem" }}>
        Copy this prompt and paste it into an AI agent, then describe the section you want. The
        agent will follow this site's theme, typography, and spacing. Paste the result below.
      </p>
    </div>
  );
};
