# @focus-reactive/payload-plugin-netlify-deploy

A **Publish** button for [Payload CMS](https://payloadcms.com/) sites hosted on [Netlify](https://www.netlify.com/): build the site from the admin, watch the build log, check a preview and publish it — without leaving the document you just saved.

A site on Netlify only shows what Payload holds after it is rebuilt. Editors usually have to ask a developer, trigger a build hook or run a Slack command, and then wait without seeing whether the build worked. This plugin puts that step where editors already are, and works for one site as well as for a CMS that feeds dozens.

## What it does

- **Publish button beside Save** — on every document of the collections you list, or in the admin's top bar for a single site. It shows the state of the site at a glance: a coloured dot, a label and the number of saved changes waiting to go live.
- **Statuses** — the button and its drawer always say where the site is: _Live_, _Not published_, _In queue_ (waiting for a free Netlify builder), _Building_, _Preview ready_, _Build failed_, _Publishing_. They update by themselves, and a toast tells the editor when a build is ready, has failed or went live, wherever they are in the admin.
- **Live build log** — the Netlify log streams into the drawer while the site builds, with warnings and errors highlighted, and stays there after a failure. When a build fails, Netlify's own reason is shown above the log, word for word.
- **Preview before it goes live** — on a site whose auto-publishing is locked, a build becomes a preview first: _Open preview_ opens the built site on its own Netlify URL, _Publish_ makes it live, _Discard_ drops it. On a site that auto-publishes, the button builds and publishes in one go.
- **What changed** — optionally, the list of documents saved since the live site was built ("Saved since the last publish"), and on a preview, what that preview includes. The count sits on the button.
- **One build at a time** — while any build of the site runs, started from the admin, a git push, a build hook or the Netlify UI, the button is locked and says so. Different sites build in parallel.
- **Cancel and history** — your own build can be cancelled; the last deploys are listed with their state, when they ran and how long they took.
- **Unsaved changes warning** — a build uses what is saved, so the drawer warns when the document has unsaved edits.
- **Many sites** — each document can resolve to its own Netlify site, with a note of its own ("One site serves 4 editions…").
- **Roles** — who may build and who may publish are ordinary Payload access functions.
- **Hooks** — `onBuild` and `onPublish` run on the server after a build starts or a preview is published, to tell a Slack channel, for instance.

## Requirements

- Payload **3.84** or later, React 19.
- **Node 22** or later on the server that runs Payload — the build log is read over a WebSocket.
- A site that **builds on Netlify**: a build command in its Netlify settings. A site built in another CI and uploaded with `netlify deploy` has no Netlify build for the button to start.
- A Netlify account with access to that site.

## Setup

### 1. Create a Netlify token

1. In Netlify, open **User settings → Applications → Personal access tokens** ([app.netlify.com/user/applications](https://app.netlify.com/user/applications#personal-access-tokens)).
2. Choose **New access token**, name it after the CMS (`payload-admin`), pick an expiry and generate it.
3. Copy the token — Netlify shows it only once.

A personal access token can do whatever its owner can do in Netlify; it cannot be limited to one site. Create it from an account with the **Developer** role on the team and access to the sites the CMS builds, rather than from a team owner, and give it an expiry you will remember to renew.

### 2. Give the token to the CMS server

Add it to the environment of the server that runs Payload — not to the frontend, and never as a `NEXT_PUBLIC_` variable:

```bash
# .env
NETLIFY_AUTH_TOKEN=your-token
```

Do the same on the CMS's host. On Vercel: **Project → Settings → Environment Variables**, add `NETLIFY_AUTH_TOKEN`, mark it **Sensitive**, select the environments that should build (Production, and Preview if preview deployments of the CMS may build too) and redeploy. Without the token the button does not appear.

### 3. Install

```bash
pnpm add @focus-reactive/payload-plugin-netlify-deploy
```

### 4. Register the plugin

One site:

```ts
// payload.config.ts
import { netlifyDeployPlugin } from "@focus-reactive/payload-plugin-netlify-deploy";

export default buildConfig({
  plugins: [
    netlifyDeployPlugin({
      token: process.env.NETLIFY_AUTH_TOKEN,
      site: "my-site.netlify.app", // the site id, or any of its domains
      collections: ["pages", "posts"], // the button beside Save
      header: true, // and in the admin's top bar
    }),
  ],
});
```

A site per document — when one CMS feeds many sites, `site` is a function. It gets the document the button sits on and returns that document's Netlify site, or null where there is none, which hides the button:

```ts
netlifyDeployPlugin({
  token: process.env.NETLIFY_AUTH_TOKEN,
  collections: ["pages", "brands"],
  access: { build: isEditor, publish: isEditor }, // the same functions your collections use
  site: async ({ req, collection, id }) => {
    if (!collection || !id) return null;
    const doc = await req.payload.findByID({ collection, id, depth: 1, req, overrideAccess: false });
    const brand = collection === "brands" ? doc : doc.brand;
    return brand?.url ? { site: new URL(brand.url).host, note: `Builds ${brand.title}.` } : null;
  },
  // What the next build carries: documents saved since the live site was built.
  changes: async ({ req, since }) => {
    const { docs } = await req.payload.find({
      collection: "pages",
      where: since ? { updatedAt: { greater_than: since.toISOString() } } : {},
      pagination: false,
      req,
      overrideAccess: false,
    });
    return docs.map((page) => ({ label: page.title, updatedAt: page.updatedAt }));
  },
});
```

### 5. Regenerate the import map

```bash
pnpm payload generate:importmap
```

### 6. Set up the site on Netlify (optional)

- **Preview before publishing** — in the site's **Deploys**, open the published deploy and choose **Lock to stop auto publishing**. From then on a build from the admin waits as a preview until someone presses _Publish_. Without the lock, the button reads _Build and publish_ and a finished build goes live at once.
- **Only the admin builds** — to keep pushes to the production branch from deploying by themselves, set the site's builds to **Stopped builds** in its build settings. The plugin allows builds for the moment it queues one, then stops them again.

### 7. Try it

Open a document of a listed collection and press **Publish** beside Save, then **Build preview**. The log starts streaming; when the build is done, **Open preview**, check it, and **Publish to <your domain>**.

## Options

| Option | Type | Default | What it does |
|---|---|---|---|
| `token` | `string \| undefined` | — | The Netlify personal access token. Server-side only; without it the button does not appear |
| `site` | `string \| (args) => SiteTarget \| null` | — | The site to build: its id or domain, or a function that returns `{ site, note? }` for the document the button sits on. `note` is a line shown in the drawer; `null` hides the button |
| `collections` | `CollectionSlug[]` | `[]` | Collections whose edit view gets the button beside Save |
| `header` | `boolean` | `false` | Also put the button in the admin's top bar. Meant for a single site: there is no document there |
| `access` | `{ build?: Access, publish?: Access }` | anyone signed in | Payload access functions for who may start or cancel a build and who may publish. Only `true` allows |
| `changes` | `(args) => DeployChange[]` | — | The documents saved since `since` — when the live build started, so a save made during it still counts. Each is `{ label, updatedAt, url? }` |
| `onBuild` | `(args) => void` | — | Called on the server after a build starts, with `{ req, site, deployId }` |
| `onPublish` | `(args) => void` | — | Called on the server after a preview is published |

`site` and `changes` get `{ req, collection, id }` — the document the button sits on, or nulls for the top-bar button. Query with `req` and `overrideAccess: false`, so an editor only reaches what they may read.

## Troubleshooting

| What you see | Why |
|---|---|
| No button | `NETLIFY_AUTH_TOKEN` is not set on this server; `site` returned null for this document; the collection is not in `collections`; the import map was not regenerated. When Netlify refused a request, the server log has `netlify-deploy request failed` with its answer |
| `401` or `403` from Netlify in the server log | the token expired or was revoked, or its owner has no access to the site |
| `404` from Netlify | the site id or domain is not one this token's account can see |
| "You are not allowed to start a build." | `access.build` returned something other than `true` for this user |
| "A build of this site is already running." | a build started elsewhere is still running; wait for it or cancel it on Netlify |
| The build starts, but no log appears | the server runs Node older than 22 |
| _Build and publish_ where you expected _Build preview_ | the site's auto-publishing is not locked (setup step 6) |

## How it works

- **Status** — the plugin reads the site and its latest production deploys from the Netlify API. The newest deploy decides what the drawer shows. The admin asks every few seconds while a build runs, and rarely otherwise, only while the tab is visible.
- **Build** — `POST /sites/:site/builds`, titled `Payload · <editor>`, so the drawer knows its own builds. A site with stopped builds has them allowed just long enough to queue the build.
- **Publish** — restores the finished deploy, which is how a locked site is published.
- **Log** — read from the WebSocket that `netlify logs:deploy` uses, a short read per request, so no connection outlives it.
- **Security** — the token never leaves the server. The site always comes from the configuration and the document, never from the request, so the endpoints cannot be pointed at another site, and every endpoint needs a signed-in user.

## Endpoints

All under your API route, with `collection` and `id` query parameters for a document (none for the top-bar button):

| | |
|---|---|
| `GET /netlify-deploy/status` | the site, its phase, the current deploy, recent deploys, changes, permissions |
| `POST /netlify-deploy/build` | start a build; `409` while one runs |
| `POST /netlify-deploy/cancel` | `{ deployId }` — cancel a running build |
| `POST /netlify-deploy/publish` | `{ deployId }` — publish a finished build |
| `GET /netlify-deploy/log?deploy=<id>` | the build log so far, and whether the build has ended |

## Good to know

- **Build minutes** — a button makes builds easy to start. The lock stops parallel builds of a site, not frequent ones.
- **Stopped builds** — for the few seconds a build is being queued on a site with stopped builds, a push to its production branch would build too. The same holds for any tool that builds such a site through the API.
- **A discarded preview** stays a finished deploy on Netlify; the admin just stops offering it, per browser.

## License

MIT
