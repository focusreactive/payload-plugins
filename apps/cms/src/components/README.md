# Components

```
components/
  shared/      # shared building blocks composed everywhere:
               #   CMSLink, Media, RichText (renderer), SectionContainer, Container, Link
               #   import from "@/components/shared"
  admin/       # components rendered inside the Payload admin panel:
               #   RowLabel, CopyAiPromptButton, Icon, Logo, SSOButtons (+ readPath helper)
               #   referenced by path string in field/collection configs + the import map
  seo/         # JSON-LD renderers + schema builders (JsonLd, ArticleJsonLd, BlogJsonLd, FaqJsonLd, …)
  <Component>/ # every other reusable component gets its own folder, flat here:
               #   Button, SectionHeader, Eyebrow, DisplayHeading, GridLines, AbstractBackdrop,
               #   Switch, HorizontalSelect, image, link, richText, Card, Accordion, Pagination,
               #   FaqSection, CtaBandSection, AuthorAvatar, PageRange, ErrorBoundary, EmptyState,
               #   SkeletonFallback, EmptyBlock, blog, newsletter, ctaBand, cookieBanner, copy, linksList,
               #   Testimonials, RelatedPosts, BlogPostsGrid, ThemeSelector, LocaleSelector,
               #   LivePreviewListener, PayloadRedirects   (← former entities/ + features/)
  utils.ts     # the one canonical cn / cva / resolveBackdropTone — import from "@/components/utils"
```

## Conventions

- **`shared/`**, **`admin/`**, and **`seo/`** are the grouped folders — `shared/` for
  cross-cutting building blocks, `admin/` for Payload admin-panel UI, `seo/` for JSON-LD output.
- Any other component is its own top-level folder: `components/<ComponentName>/`.
  Import it directly: `import { Card } from "@/components/Card"`.
- A component owned by exactly one block/collection is **not** here — it stays
  colocated in that feature's `ui/` folder (`blocks/<Block>/ui`,
  `collections/Header|Footer/ui`) next to its `Component.tsx` controller.

## Colocated block sections — enforced boundary

Each block's/collection's `ui/` folder is the presentational section (props in →
JSX out). `oxlint.config.ts` forbids `blocks/*/ui/**` and `collections/*/ui/**`
from importing `@/payload-types`, `@/dal`, `@/lib/adapters`, `payload`, or
`@payloadcms/*`. Data/Payload access belongs in the block's `Component.tsx`
controller, which maps the data to plain props and passes them into the section.
