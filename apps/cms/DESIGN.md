---
version: beta
name: Sandbox E
description: Marks & Clerk demo. The visual language is Untitled UI React PRO; this file records only what we changed on top of it.
source: Untitled UI React PRO (licensed)
---

# Sandbox E design language

**Superseded 2026-09-23.** This file used to define a hand-built design language - a token list and
a set of prohibitions (no elevation, no gradients, no pill radii, no cards, no centred body copy).
Two attempts were built against it and both were rejected as looking weak and outdated. The reason
is now understood and is worth keeping: those prohibitions removed exactly the things that make a
professionally designed section look designed, so porting a good library and then applying them
produced a page that read like a 2012 editorial blog.

**The design now comes from Untitled UI React PRO, and sections are taken as-is.**

## The rule

A section's JSX and its className strings are copied from the library verbatim into the block's
`ui/index.tsx`. Only literal demo content is swapped for props. A sub-block we hold no data for -
an icon, a tick list, a ratings row, a logo cloud - is deleted, never filled with invented content.
Nobody hand-writes layout classes here. That is what failed twice.

## Where the seams are

- **Our adjustments are tokens only**, in `src/styles/brand.css`, imported after their `theme.css`
  so `untitledui upgrade` cannot clobber them. It carries Marks & Clerk's own brand ramp
  (`#E20050`, taken from the wordmark their site serves) and maps `--font-display` to Newsreader,
  `--font-body` to Archivo, `--font-mono` to IBM Plex. Untitled UI ships a purple ramp and Inter.
- **Their section owns its own padding, container and max width.** Each ported block passes
  `paddingX: "none"` and `maxWidth: "none"` (and where their markup brings its own `py`,
  `paddingY: "none"`) to `SectionContainer`, which then contributes only the background, the
  `data-theme` and the anchor id. Nesting our container inside theirs cost about 270px of content
  width and halved every screenshot.
- **Alternating surface tone is a CMS field, not CSS.** The seed sets `section.theme` to `light`
  and `light-gray` on alternate homepage blocks, so an editor can change where a boundary falls.

## Adding a section

```sh
./scripts/secrets.sh run shared -- \
  'npx untitledui@latest search "<what you need>" -k "$UNTITLEDUI_API_KEY" -t components -l 10'
./scripts/secrets.sh run shared -- \
  'npx untitledui@latest add <name> --license "$UNTITLEDUI_API_KEY" --yes'
```

Their CLI shells out to `npm` for dependencies, which cannot resolve this workspace's
`workspace:*` protocol. That step will fail; install the dependencies it names with `bun` from the
repo root instead, where the private-registry config lives.
