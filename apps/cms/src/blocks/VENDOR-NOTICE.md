# Vendor notice

## Untitled UI React PRO (current source, from 2026-09-23)

Every marketing section on this app now comes from Untitled UI React PRO under the licence the
deal owner holds. Their files sit under `apps/cms/src/shared/ui/shadcn/`, installed by their CLI
and not edited. Where a section is rendered by a Payload block, the block's `ui/index.tsx` carries
their JSX and className strings verbatim with only the literal content swapped for props. See
`apps/cms/DESIGN.md`.

Untitled UI is a commercial licence, not an open-source one: these files must not be redistributed
outside a project the licence covers.

## Tailark blocks (superseded, still present in some layouts)

Some layout structure in this directory was adapted from [Tailark](https://github.com/tailark/blocks),
MIT licensed. The source repo ships as `radix`/`dusk` and `radix`/`mist` shadcn registry blocks; this
app used the `radix` base, `mist` kit. No Tailark source file is vendored verbatim: every import was
rewritten against this app's own primitives (`@/components/*`, `cn`, `cva`) and every SaaS-style
decoration banned by the since-superseded rules in `apps/cms/DESIGN.md` (gradients, glows, pill radii, coloured-circle icons, card
shadows, centred body copy) was stripped. What was kept is grid structure, column ratios, and
responsive breakpoints from the source file named below.

## MIT License

```
MIT License

Copyright (c) 2025 Irung

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Which block came from which source file

Paths below are under `https://github.com/tailark/blocks/blob/main/registry/bases/radix/mist/blocks/`.

| This app's component | Tailark source | What was kept |
|---|---|---|
| `apps/cms/src/blocks/Hero/ui/index.tsx` (centered variant) | `hero-section/five.tsx` and `six.tsx` | Centered heading and copy above a single image below the fold, with the shadow/ring frame dropped for a hairline border |
| `apps/cms/src/blocks/Hero/ui/index.tsx` (showcase variant) | `hero-section/one.tsx` | The text column held to roughly half the row width with the image in an independent, non-stretched column beside it |
| `apps/cms/src/blocks/Content/ui/index.tsx` | `content/one.tsx` and `two.tsx` | Each source file repeats one row twice (`grid sm:grid-cols-5`, image at `col-span-2`, text at `col-span-3` with `border-l pl-12`) to build a stacked feature list; this block has one image and one text field, so it takes a single row of that pattern, adapted from a 5-column to a 12-column split (5/7) for consistency with the rest of the site's grid |
| `apps/cms/src/blocks/Stats/ui/index.tsx` | `stats/four.tsx` | The 2-column-mobile / 4-column-desktop grid and the border-top rule marking each figure, in place of Tailark's bordered card |
| `apps/cms/src/components/CtaBandSection` (`CtaBand` block) | `call-to-action/two.tsx` | The flex `justify-between` band with the heading and description on one side and the actions right-aligned on the other |
| `apps/cms/src/collections/Footer/ui/index.tsx` | `footer/two.tsx` | The wide brand column plus three narrower link-group columns |
| `apps/cms/src/collections/Header/ui/index.tsx` and `ui/components/{DesktopNav,DropdownContent,MegaLink,FeaturedCard,Chevron}.tsx` | `hero-section/two-header.tsx` (functionally identical to `hero-section/four-header.tsx`) | The Radix `NavigationMenu` mega-menu structure and the featured-card teaser inside a dropdown panel |
| `apps/cms/src/components/FaqSection/index.tsx` and `apps/cms/src/components/Accordion/index.tsx` | `faqs/two.tsx` | Verified rather than rewritten: this app's `0.8fr/1.2fr` header-plus-accordion grid is already the same ~40/60 column ratio as Tailark's `md:grid-cols-5` (`col-span-2`/`col-span-3`) split, and the existing `Accordion` was already a plain hairline-rule list with no card, shadow, or rounded-highlight background - the thing `two.tsx` has and `one.tsx` (shadow/ring card) and `three.tsx` (rounded-highlight pill, custom `hr`) do not. Not ported: `two.tsx`'s "contact support" link under the heading, since adding it would need a new field outside this block's schema |

## Not ported, and why

- **CardsGrid / `DefaultCard`** - the nine `features/*.tsx` files fetched are all bento-style
  dashboard mockups (nested cards, avatar stacks); none is a plain icon-title-description-link
  grid. `DefaultCard`'s flat bordered card was hand-built from the general `DESIGN.md` card rule,
  not ported from a specific file.
- **TestimonialsList** - the `testimonials/` category was never actually fetched this pass. The
  change made (dropping the auto-scrolling marquee for a static grid) removed a `DESIGN.md`
  violation but was not checked against a real Tailark testimonials file.
- **Logos** - there is no logos category in the OSS Tailark repo; the existing grayscale logo row
  is original and untouched by this pass.
