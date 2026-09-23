---
version: alpha
name: Sandbox E
description: Speculative visual direction for an international intellectual-property law firm mid-rebrand. Editorial, typographic, restrained.
colors:
  paper: "#FBFAF7"
  surface: "#FFFFFF"
  surface-sunken: "#F2EFE8"
  ink: "#15171B"
  ink-secondary: "#585D66"
  ink-tertiary: "#646972"
  rule: "#E3DED3"
  accent: "#1F4B43"
  accent-hover: "#16382F"
  accent-soft: "#E7EEEB"
typography:
  display: "Newsreader, Georgia, serif"
  body: "Archivo, system-ui, sans-serif"
  kicker: "IBM Plex Mono, ui-monospace, monospace"
spacing:
  container-max: "1180px"
  gutter: "clamp(20px, 5vw, 64px)"
  section: "clamp(72px, 10vw, 128px)"
radius:
  base: "2px"
  card: "4px"
motion:
  reveal-duration: "400ms"
  reveal-easing: "cubic-bezier(0.22, 1, 0.36, 1)"
  reveal-distance: "12px"
---

# Sandbox E design language

The client is 140 years old, advises on patents and litigation, and is choosing a brand agency while
we build. So this direction is deliberately quiet: it has to look considered without pre-empting
anybody's rebrand. The register is a printed legal journal, not a SaaS landing page.

Every section on this site is composed from these tokens. An agent that needs a value not listed here
picks the nearest listed one rather than inventing a sibling.

## Colour

Warm paper rather than white, near-black rather than black, and one accent used sparingly.

| Token | Value | Where it is allowed |
|---|---|---|
| `paper` | `#FBFAF7` | The page background, always |
| `surface` | `#FFFFFF` | A card sitting on paper, and nothing else |
| `surface-sunken` | `#F2EFE8` | One band per page at most, to separate a section |
| `ink` | `#15171B` | Headings and body copy |
| `ink-secondary` | `#585D66` | Standfirsts, metadata, captions |
| `ink-tertiary` | `#646972` | Dates, counts, disabled states |
| `rule` | `#E3DED3` | Every divider and every card border, at 1px |
| `accent` | `#1F4B43` | Links, one button per section, the active state of a filter |

The accent is a deep green. It appears on at most three elements per screen. A section that needs
emphasis gets `surface-sunken` behind it, never a coloured fill.

## Typography

Two families. Newsreader for anything that carries the voice, Archivo for anything that carries
information. Both are already loaded in `src/app/(frontend)/[locale]/layout.tsx` as
`--font-newsreader` and `--font-archivo`, so no font work is needed.

| Role | Family | Size / line-height | Tracking | Weight |
|---|---|---|---|---|
| Display | Newsreader | 56px / 1.05 | -0.02em | 400 |
| Heading 1 | Newsreader | 40px / 1.1 | -0.015em | 400 |
| Heading 2 | Newsreader | 30px / 1.15 | -0.01em | 400 |
| Heading 3 | Archivo | 20px / 1.3 | 0 | 600 |
| Body large | Archivo | 19px / 1.65 | 0 | 400 |
| Body | Archivo | 17px / 1.65 | 0 | 400 |
| Kicker | IBM Plex Mono | 12px / 1.2 | 0.14em, uppercase | 500 |
| Caption | Archivo | 14px / 1.45 | 0 | 400 |

The serif is never bold, because a bold serif at display size reads as a newspaper headline rather
than a considered one. Emphasis comes from size and whitespace.

The kicker is the editorial signature of this design: a short uppercase label above a heading, set
in the mono face at 12px in `ink-tertiary`, with a hairline rule under the whole section header. Use
it on every major section. It is never a pill, never filled, never coloured - the existing `Eyebrow`
component defaults to exactly this now, so use that rather than writing a span.

## Layout

- Container `1180px`, gutters `clamp(20px, 5vw, 64px)`.
- Vertical rhythm `clamp(72px, 10vw, 128px)` between sections. Generous space is the whole look, so
  never compress a section to fit more on screen.
- Text measure never exceeds 68 characters. A full-width paragraph is the fastest way to make this
  look like a template.
- Asymmetry over centring: a section header sits left, a lead paragraph sits in a column beside it
  rather than under it.
- The grid is 12 columns. An editorial pairing is 5 + 7 or 4 + 8, never 6 + 6, because equal halves
  read as a brochure.

## Components

**Card.** `surface` fill, 1px `rule` border, `4px` radius, no shadow. Hover raises nothing and
changes only the heading colour to `accent`.

**Button.** Two only. Primary is `accent` fill, `paper` text, `2px` radius, 12px/24px padding.
Secondary is a 1px `rule` border with `ink` text. No third variant, no icon-only button, no pill.

**Link.** `accent`, underlined at 1px with a 2px offset. Underline stays on hover and the colour
darkens to `accent-hover`.

**Divider.** 1px `rule`, full container width. This is the main structural device of the site, and it
replaces the boxes and shadows another design would reach for.

**Insight card.** Kicker carrying the practice area, then a Newsreader heading at Heading 3 size,
then a one-line standfirst in `ink-secondary`, then the author name and date in `caption`. No image
unless the article has one, because a placeholder image is worse than none.

**Person card.** Portrait at 4:5, name in Newsreader, role in `caption`, offices in
`ink-tertiary`. Nothing else on the card.

## Motion

One reveal primitive for the whole site: 12px rise and fade in, 400ms,
`cubic-bezier(0.22, 1, 0.36, 1)`, taking a `delay` prop for stagger. Every use of it must have a CSS
floor so a page whose JavaScript fails still shows its content.

Nothing else moves. No parallax, no marquee, no counter that animates, no hover that scales.

## Never

- Gradients, glassmorphism, blur, glow, neon, or a coloured drop shadow.
- A hero with text over a photograph.
- Icons in coloured circles, three across.
- Rounded corners above `4px`.
- A statistic in a coloured card. Statistics get a rule above and generous space.
- Emoji anywhere.
- Centre-aligned body copy.
- A section whose heading is the only content above 200px of empty space - whitespace is rhythm, not
  padding.
