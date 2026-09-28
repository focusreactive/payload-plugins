# @focus-reactive/payload-plugin-netlify-deploy

Build, preview and publish [Netlify](https://www.netlify.com/) sites from the [Payload CMS](https://payloadcms.com/) admin.

A site on Netlify only shows what Payload holds after it is rebuilt. This plugin puts that step where editors already are: a **Publish** button beside Save that builds the site, streams the Netlify build log into a drawer, keeps anyone from starting a second build while one runs, and shows Netlify's reason when a build fails. It works for one site, and for a CMS that feeds dozens.

## Features

- **Build from the document** — the button sits beside Save and builds the site that document ends up on.
- **Live build log** — the log streams into the drawer while Netlify builds, and stays readable after a failure, as Netlify wrote it.
- **One build at a time per site** — while a build of the site runs, from anywhere (the admin, a git push, a Slack command, the Netlify UI), the button is locked and says so. Different sites build in parallel.
- **Preview, then publish** — on a site whose auto-publishing is locked, a build becomes a preview first: open it, then publish it or discard it. On a site that auto-publishes, the build goes live when it is ready.
- **Queue, cancel, history** — a build waiting for a free Netlify builder shows as queued, your own build can be cancelled, and the last deploys are listed with how long they took.
- **What is waiting** — optionally, the documents saved since the site was last published, counted on the button.
- **Many sites** — each document can resolve to its own Netlify site.

## Installation

```bash
pnpm add @focus-reactive/payload-plugin-netlify-deploy
```

Requires Node 22 or later on the server (the build log is read over a WebSocket).

## Usage

### One site

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

### A site per document

When one CMS feeds many sites, pass a function. It gets the document the button sits on and returns that document's Netlify site — or null where there is none, which hides the button.

```ts
netlifyDeployPlugin({
  token: process.env.NETLIFY_AUTH_TOKEN,
  collections: ["pages", "brands"],
  site: async ({ req, collection, id }) => {
    if (!collection || !id) return null;
    const doc = await req.payload.findByID({ collection, id, depth: 1, req, overrideAccess: false });
    const brand = collection === "brands" ? doc : doc.brand;
    return brand?.url ? { site: new URL(brand.url).host, note: `Builds ${brand.title}.` } : null;
  },
  // Show what the next build carries: documents saved since the last publish.
  changes: async ({ req, since }) => {
    const { docs } = await req.payload.find({
      collection: "pages",
      where: since ? { updatedAt: { greater_than: since.toISOString() } } : {},
      req,
      overrideAccess: false,
    });
    return docs.map((page) => ({ label: page.title, updatedAt: page.updatedAt }));
  },
});
```

Then regenerate the import map:

```bash
pnpm payload generate:importmap
```

### The token

A Netlify personal access token (User settings → Applications → Personal access tokens). It stays on the server — the browser only talks to the plugin's endpoints — but Netlify cannot scope it to one site: it can do whatever its owner can. Issue it from an account with the Developer role rather than a team owner.

## Options

| Option | Type | Default | |
|---|---|---|---|
| `token` | `string` | — | Netlify personal access token |
| `site` | `string \| (args) => SiteTarget \| null` | — | One site for the whole CMS, or a function returning `{ site, note? }` per document |
| `collections` | `CollectionSlug[]` | `[]` | Collections whose edit view gets the button |
| `header` | `boolean` | `false` | Also put the button in the admin's top bar (for a single site) |
| `access` | `{ build?: Access, publish?: Access }` | anyone signed in | Payload access functions for who may build and who may publish; only `true` allows |
| `changes` | `(args) => DeployChange[]` | — | Documents saved since `since` — when the live build started, so a save made during it still counts |
| `onBuild` | `(args) => void` | — | Called after a build starts — tell a Slack channel, for instance |
| `onPublish` | `(args) => void` | — | Called after a preview is published |

## How it works

- **Status** — the plugin reads the site and its latest production deploys from the Netlify API. The newest deploy decides what the panel shows: queued, building, a preview waiting to be published, failed, or nothing waiting. The admin asks every few seconds while a build runs, and rarely otherwise.
- **Build** — `POST /sites/:site/builds`, titled `Payload · <editor>` so the panel knows its own builds. A site whose builds are stopped (so a git push does not deploy by itself) has them allowed just long enough to queue the build.
- **Publish** — restores the finished deploy, which is how a locked site is published.
- **Log** — read from the WebSocket `netlify-cli`'s `logs:deploy` uses, a short read per request, so no connection outlives it.
- **Security** — the site always comes from the configuration and the document, never from the request, so the endpoints cannot be pointed at another site. Every endpoint needs a signed-in user.

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

- **Build minutes** — a button makes builds easy to start; the lock stops parallel builds of a site, not frequent ones.
- **Stopped builds** — for the few seconds a build is being queued on a site with stopped builds, a git push to its production branch would build too. The same holds for any tool that builds such a site through the API.
- **A discarded preview** stays a finished deploy on Netlify; the admin just stops offering it, per browser.

## License

MIT
