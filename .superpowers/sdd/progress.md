# SDD Progress Ledger — apps/cms template TODO improvements

Branch: `fix/cms-template-todo-improvements`
Base commit (merge-base main): `c4e8d53`
Repo: payload-plugins, target app: `apps/cms` (the scaffolding template; create-ideal-cms copies it)

Scope decided with user:
- ONLY changes that apply to the template `apps/cms`. NO stots.edu changes.
- Include the unstable_cache -> `use cache` migration (dedicated, latest docs).
- Focal point: center 50/50 via a Media beforeChange hook.
- Skip both presets-plugin items.

Items already correct in the template (NOT in scope): header aria-label, reserved-slug APIError isPublic, req.locale in non-indexEmbedding hooks.

## Tasks

- [x] Task 1 — mechanical fixes: og:type (was actually missing, now fixed), getAllDocuments pagination:false, Page parent filterOptions guard (Posts had NO parent bug — line 257 is relatedPosts not_in, correctly left alone), req.locale->getLocaleFromRequest (2 hooks)
- [x] Task 2 — defaultValues `as const satisfies LocalizedDefaults` (check-types confirms type fits); Media beforeChange focal-point default 50/50
- [x] Task 3 — admin labels: added BlockLabel + shared readPath, extended RowLabel (prefix/titleField, back-compat). BLOCKS UNWIRED ON PURPOSE: presets plugin swaps custom block Label -> BlockLabelServerWrapper, which (a) disables presets' editable blockName field [root cause of the skipped stots.edu "can't set block name" item] and (b) isn't injected into importMap by Payload 3.84 -> renders blank. Component kept (available), not wired.
- [x] Task 4 — Footer copywriteText->copyrightText (config + Component) + regenerated payload-types + data-preserving RENAME migration (footer_locales + _footer_v_locales), registered in index.ts
- [~] Task 5 — cache migration: BLOCKED, reverted cleanly (scope guard). `use cache` needs `cacheComponents` app-wide, blocked by: (1) next-intl 4 has no Cache Components support (upstream issue #1493) — getTranslations/getMessages/getLocale read headers(), illegal in 'use cache', used in ~10 server components + Link/redirect; (2) every frontend route is request-dynamic (draftMode()/getMessages() outside Suspense) -> needs page+layout re-architecture for PPR; (3) cacheComponents forces build-time Payload DB connection -> hit pre-existing migration drift (`_hidden` column) against shared Neon DB. Baseline check-types + build PASS. NOT a small fix. SIDE EFFECT: the cacheComponents build connected to shared Neon DB + ran migrations (aborted on pre-existing drift) and transiently deleted the Task 4 migration files (restored from HEAD; verified intact).

## Completion log
Tasks 1-4: complete (commits c4e8d53..fd2f8ad). check-types PASS; lint adds 0 new warnings (44 pre-existing in untouched files); lefthook per-commit lint 0/0 on changed files.
- e579a8b Task 1 | 58b5c70 Task 2 | b6cfaf7 Task 3 | fd2f8ad Task 4

## Completion log
(append `Task N: complete (commits <base7>..<head7>, review clean)` as tasks finish)
