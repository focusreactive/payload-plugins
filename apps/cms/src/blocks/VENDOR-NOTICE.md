# Vendor notice: Tailark blocks

Some layout structure in this directory was adapted from [Tailark](https://github.com/tailark/blocks),
MIT licensed. The source repo ships as `radix`/`dusk` and `radix`/`mist` shadcn registry blocks; this
app used the `radix` base, `mist` kit. No Tailark source file is vendored verbatim: every import was
rewritten against this app's own primitives (`@/components/*`, `cn`, `cva`) and every SaaS-style
decoration banned by `apps/cms/DESIGN.md` (gradients, glows, pill radii, coloured-circle icons, card
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
| `apps/cms/src/blocks/Content/ui/index.tsx` | `content/one.tsx` | The asymmetric column split (Tailark's 5-column `grid-cols-5` with a 2/3 image-text ratio, adapted here to a 12-column 5/7 ratio) and the hairline rule between the two sides, in place of Tailark's filled panel background |
| `apps/cms/src/blocks/Stats/ui/index.tsx` | `stats/four.tsx` | The 2-column-mobile / 4-column-desktop grid and the border-top rule marking each figure, in place of Tailark's bordered card |
| `apps/cms/src/components/CtaBandSection` (`CtaBand` block) | `call-to-action/two.tsx` | The flex `justify-between` band with the heading and description on one side and the actions right-aligned on the other |
| `apps/cms/src/collections/Footer/ui/index.tsx` | `footer/two.tsx` | The wide brand column plus three narrower link-group columns |
| `apps/cms/src/collections/Header/ui/index.tsx` and `ui/components/{DesktopNav,DropdownContent,MegaLink,FeaturedCard,Chevron}.tsx` | `hero-section/two-header.tsx` (functionally identical to `hero-section/four-header.tsx`) | The Radix `NavigationMenu` mega-menu structure and the featured-card teaser inside a dropdown panel |

## Not ported, and why

- **Hero** (`apps/cms/src/blocks/Hero/ui/index.tsx`) - every hero-section file actually fetched
  (`one` through `six`) is a centred, single-column hero with a below-fold hero image and a
  logo strip; none matches this app's badge-heading-actions-plus-aside-image layout. That layout
  was hand-built against `DESIGN.md`, not ported. Worth revisiting against a hero-section file this
  pass did not fetch, if a closer match exists.
- **CardsGrid / `DefaultCard`** - the nine `features/*.tsx` files fetched are all bento-style
  dashboard mockups (nested cards, avatar stacks); none is a plain icon-title-description-link
  grid. `DefaultCard`'s flat bordered card was hand-built from the general `DESIGN.md` card rule,
  not ported from a specific file.
- **TestimonialsList** - the `testimonials/` category was never actually fetched this pass. The
  change made (dropping the auto-scrolling marquee for a static grid) removed a `DESIGN.md`
  violation but was not checked against a real Tailark testimonials file.
- **Faq** - the `faqs/` category was never fetched either. The existing two-column
  `SectionHeader` + `Accordion` layout predates this pass and was not verified against Tailark.
- **Logos** - there is no logos category in the OSS Tailark repo; the existing grayscale logo row
  is original and untouched by this pass.
