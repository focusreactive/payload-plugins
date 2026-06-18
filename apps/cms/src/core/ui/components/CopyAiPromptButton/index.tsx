"use client";

import { Button } from "@payloadcms/ui";
import { useState } from "react";

/**
 * Prompt handed to an AI assistant so it generates markup that matches this
 * project's design system. Keep the tokens below in sync with
 * `packages/tailwind-config/base.css` — they are the source of truth.
 */
const AI_PROMPT = `You are generating a single, self-contained block of HTML to paste into a "Raw HTML" page section of our website. The HTML is injected with dangerouslySetInnerHTML inside a themed section container, so follow these rules exactly:

OUTPUT
- Return ONE HTML fragment only. No <html>, <head>, <body>, <script>, <style>, or external CSS/JS. No markdown fences, no commentary.
- Style everything with Tailwind CSS utility classes (Tailwind v4 is already loaded on the page).
- Make it responsive (mobile-first) and accessible (semantic tags, alt text, aria where needed).

COLORS — use our semantic tokens, never hard-coded hex. The surrounding section sets a light/dark theme via data-theme, and these tokens adapt automatically, so do NOT hard-code colors:
- Surfaces/text: bg-background, text-foreground, bg-surface, bg-surface-muted, bg-card, text-card-foreground, bg-muted, text-muted-foreground
- Brand/actions: bg-primary, text-primary-foreground, hover:bg-primary-hover, bg-secondary, text-secondary-foreground, bg-accent, text-accent-foreground
- Borders/rings: border-border, border-border-strong, ring-ring

TYPOGRAPHY — prefer our utilities over ad-hoc font sizes:
- Headings/display: text-display-1, text-display-2, text-h-section, text-h-card
- Body: text-lead, text-body-lg, text-small
- Eyebrow/label: text-eyebrow (uppercase mono kicker)
- Font families: font-display (serif headings), font-sans (body), font-mono (code/labels)

SHAPE & MOTION
- Radii: rounded-sm (8px), rounded-md (16px), rounded-lg (28px), rounded-pill
- Keep spacing generous; don't set an outer max-width or vertical section padding — the section container already handles width, padding, and theming.

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
      <Button buttonStyle="secondary" onClick={handleCopy} size="small" type="button">
        {copied ? "Copied ✓" : "Copy AI Prompt"}
      </Button>
      <p className="field-description" style={{ marginTop: "0.25rem" }}>
        Copies a prompt that tells an AI assistant to generate HTML matching our design system. Paste it into your AI tool, describe the section, then paste the result below.
      </p>
    </div>
  );
};
