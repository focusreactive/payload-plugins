"use client";

import { Button } from "@payloadcms/ui";
import { useState } from "react";

/**
 * Prompt handed to an AI assistant so it generates markup that matches this
 * project's design system. Keep the tokens below in sync with
 * `packages/tailwind-config/base.css` — they are the source of truth.
 */
const AI_PROMPT = `You are generating a single, self-contained block of HTML + CSS to paste into a "Raw HTML" page section of our website. The fragment is injected with dangerouslySetInnerHTML inside a themed section container.

IMPORTANT: Do NOT use Tailwind. Tailwind on this site is precompiled, so arbitrary Tailwind utility classes will NOT work in this injected fragment. You MUST write all styles as plain CSS inside a <style> tag — use regular class names and a single <style> tag containing the CSS rules. No Tailwind classes anywhere.

OUTPUT
- Return ONE HTML fragment: first the markup, then a single <style> tag at the end containing all your CSS. Nothing else — no <html>, <head>, <body>, <script>, external CSS/JS, markdown fences, or commentary.
- Scope every CSS selector under one unique wrapper class (e.g. .rawhtml-xyz) so the styles cannot leak into the rest of the page. Wrap your whole markup in that class.
- Make it responsive (mobile-first) and accessible (semantic tags, alt text, aria where needed).

THEME TOKENS — the surrounding section exposes our design system as live CSS custom properties. Reference them with var(...); never hard-code hex colors. They adapt automatically to the section's light/dark theme, so the same fragment looks correct in every zone:
- Surfaces/text: var(--color-background), var(--color-foreground), var(--color-surface), var(--color-surface-muted), var(--color-card), var(--color-card-foreground), var(--color-muted), var(--color-muted-foreground)
- Brand/actions: var(--color-primary), var(--color-primary-foreground), var(--color-primary-hover), var(--color-secondary), var(--color-secondary-foreground), var(--color-accent), var(--color-accent-foreground)
- Borders/rings: var(--color-border), var(--color-border-strong), var(--color-ring)
- Fonts: var(--font-display) (serif headings), var(--font-sans) (body), var(--font-mono) (code/labels)
- Radii: var(--radius-sm) 8px, var(--radius-md) 16px, var(--radius-lg) 28px, var(--radius-pill) 999px

TYPOGRAPHY SCALE — match these sizes so headings/body align with the rest of the site:
- Display 1: font-display, clamp(2.8rem, 7vw, 5.4rem), line-height 0.98, letter-spacing -0.02em
- Display 2: font-display, clamp(2.2rem, 5vw, 3.6rem), line-height 1.02
- Section heading: font-display, clamp(1.9rem, 4vw, 3rem), line-height 1.05
- Card heading: font-display, 1.5rem, line-height 1.1
- Lead: clamp(1.1rem, 1.6vw, 1.32rem), line-height 1.55
- Body: 1.0625rem, line-height 1.7
- Small: 0.9375rem, line-height 1.55
- Eyebrow/kicker: font-mono, 0.72rem, letter-spacing 0.16em, text-transform uppercase

SPACING & LAYOUT
- Match the site's generous rhythm: keep comfortable spacing between elements and inside cards.
- Do NOT set an outer max-width or vertical section padding — the section container already handles width, padding, and theming. Just lay out the content inside it.

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
      <Button buttonStyle="primary" extraButtonProps={{ style: { width: "100%" } }} margin={false} onClick={handleCopy} type="button">
        {copied ? "Copied ✓" : "Copy AI Prompt"}
      </Button>
      <p className="field-description" style={{ marginTop: "0.5rem" }}>
        Copy this prompt and paste it into an AI agent, then describe the section you want. The agent will follow this site's theme, typography, and spacing. Paste the result below.
      </p>
    </div>
  );
};
