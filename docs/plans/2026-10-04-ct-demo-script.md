# CT demo — script (20 minutes)

Companion to `2026-10-04-ct-demo-plan.md` §10. One moment per feature. URLs are relative to the
demo host (local `http://localhost:3333`, the compose stack on `http://localhost:8080`, or the
Vercel preview).

## Before the call

1. Seed on the day (re-arms the scheduled post for tomorrow 09:00): `bun run seed:ct`, then
   restart the server.
2. Two browser profiles: **Editor** (`editor@ct.demo`) and **Author** (`author@ct.demo`);
   password `SEED_DEMO_PASSWORD` (default `ct-demo`). Keep `admin@ct.demo` for deletes.
3. Open tabs: `/`, `/sectors/automotive`, `/technology/ctrl-os`, `/blog`, admin.
4. Deck screenshots: `apps/cms/.local/screenshots/` (git-ignored).

## 1. The site (2 min)

`/` → `/sectors/automotive` → `/technology/ctrl-os`. Their words, their brand, a new system.
Point at the angled band above the footer and the ISO chips: "nothing you own was lost".

## 2. Page builder (3 min)

Admin → Pages → Automotive. Live preview on; change the hero title; insert the
**Gated whitepaper form** preset; publish; reload the public page.

## 3. Articles (3 min)

`/blog`: 40 migrated posts with their images (191 available with `all-posts`). Open an imported
post in the admin: Markdown in the sidebar, edit, preview; **Convert to rich text**. Create a new
post to show the Lexical toolbar. Author page (`/blog/author/<slug>`), `/resources/news`.

## 4. URLs and feeds (2 min)

Paste an old article address (`/articles/<year>/<slug>/`) → 308 → the post. `/feeds/all.atom.xml`,
`/feeds/news.atom.xml`. Admin → Redirects: add one live, try it.

## 5. Forms (3 min)

Build a 3-field form in the admin, publish, submit it on a page, show it under **Leads** with
page, referrer and UTM. Flip the block to Mautic mode and view source: `mauticform[...]` names,
no iframe. Newsletter band submits. Works with JavaScript off.

## 6. Workflow and roles (2 min)

Author profile: the home page shows the seeded comment thread ("@Demo Editor …"); edit, **Save
draft**; Publish is refused ("Authors save drafts; an editor publishes"). Editor profile: open
the mention, preview the draft on the real page, publish — or schedule. Posts →
`scheduled-news-demo` shows its 09:00 publish time. Versions → restore. Delete works only as
Admin.

## 7. Languages (2 min)

Locale switcher → `de`: translate field by field with the translator plugin (needs
`OPENAI_API_KEY`), publish, open `/de`. `/ja` shows the Japanese font.

## 8. Privacy, SEO, accessibility (1 min)

DevTools → Cookies: empty. Click a video → `youtube-nocookie` iframe only after the click.
`/robots.txt` (AI crawlers allowed), `/llms.txt`, `/sitemap.xml` (hreflang, author pages), the SEO
panel on a draft.

## 9. Self-hosted (2 min)

`docker compose up` (see `2026-10-04-ct-hosting.md`): Postgres, Nginx on :8080, cron, Keycloak
(`--profile sso`) — sign in as the editor user and land as **Editor**.
`docker image inspect` shows `debian:trixie`; the container on an `--internal` network still
serves.

## 10. Close

What is a slide, not a click (Phase 2): static files behind Nginx via the GitLab pipeline, Mautic
preference centre, approval workflow, add-to-calendar, accessibility statement.
