# Components

Two kinds of components live in this app, kept clearly separated:

- **Presentational** — props in → JSX out. Knows nothing about Payload, data
  fetching, or the request. Reusable and trivially testable.
- **Controller** — Payload/data-aware. Fetches/derives data, maps it to plain
  props, and renders presentational components. Never the other way round.

## Where things live

```
components/
  ui/                 # SHARED presentational layer (no Payload)
    primitives/       #   Button, Link, Image, RichText, SectionHeader, Eyebrow,
                      #   DisplayHeading, GridLines, AbstractBackdrop, switch, …
    sections/         #   shared sections used by >1 feature
                      #   (blog, cookieBanner, copy, ctaBand, linksList, newsletter)
    utils.ts          #   the ONE canonical cn / cva / resolveBackdropTone
    index.ts          #   barrel — import shared UI from "@/components/ui"
  shared/             # SHARED controllers (Payload-aware, used across features)
                      #   CMSLink, Media, RichText renderer, SectionContainer,
                      #   Logo, PostHero, Card, Accordion, Pagination, Admin/*, …
                      #   import from "@/components/shared"
```

Feature-owned UI is **colocated with its controller**, not here:

```
blocks/<Block>/
  config.ts           # Payload block config
  Component.tsx        # controller — Payload-aware, maps block data -> props
  ui/                 # presentational section for this block (props in -> JSX out)
collections/Header|Footer/
  Component.tsx        # controller
  ui/                 # presentational header/footer
```

## The rule of thumb

- A section used by exactly one block/collection → put it in that feature's
  `ui/` folder (colocated).
- A presentational piece reused by several features → `components/ui`.
- Anything that touches `@/payload-types`, `@/dal`, `payload`, or adapters is a
  **controller** → `Component.tsx` or `components/shared`, never `ui/`.

## Enforced boundary

`oxlint.config.ts` forbids the presentational layer (`components/ui/**`,
`blocks/*/ui/**`, `collections/*/ui/**`) from importing `@/payload-types`,
`@/dal`, `@/lib/adapters`, `payload`, `@payloadcms/*`, or `@/components/shared`.
If you reach for Payload data inside a `ui/` file, that logic belongs in the
controller — lift it up and pass plain props down.
