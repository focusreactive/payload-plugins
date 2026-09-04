# Client content sandbox D

This branch exists to hold open a preview deployment of `apps/cms` that a prospect
can log into and edit while they evaluate the CMS. Their content is a large archive
of talks, articles and lessons that currently lives in Magento, where every item is
modelled as a catalogue product.

**Do not merge this PR, and do not push unrelated code here.** The branch is a
demo surface with a date on it, not a feature in progress.

This repo is public, so the branch does not say which prospect it belongs to, and
neither does any file on it. The mapping, the login we hand out and the seeded
content all live in the deal record instead.

## What this branch adds

Unlike a stock content sandbox, this one carries code — the point being demonstrated
is that the archive collapses into one collection rather than thirty attribute sets:

- `Talk` and `Topic` collections. `Talk` holds a `requiredTier` field, which is
  editorial metadata about what an item needs, never a record of who paid
- three page-builder blocks (`TalkGrid`, `TopicChips`, `ShopifyProduct`) on top of
  the twelve already in Ideal CMS
- a talk route with a "view as" tier switch, so the gated and ungated states can be
  shown on a call without building sign-in
- a server-rendered Shopify product card, reading one product handle through the
  Storefront API

The seeded documents are the prospect's own material and are loaded over the API by
a script kept in the deal record. **No client content is committed to this repo.**

## How it works

- the open PR keeps a Vercel preview deployment alive on this branch
- the Neon integration gives that deployment its own database branch, copied from
  the parent when the branch was cut, so what they edit stays off the shared demo
- live preview resolves against the deployment's own origin (`generatePreviewPath`
  returns a relative path), so editing works on the preview domain unconfigured
- migrations auto-apply during `next build`, so pushing the branch is the whole
  deploy story

## What does not work here, by design

- **Scheduled publishing stores a schedule and never fires.** Vercel crons only run
  on production deployments, so `/api/scheduled-publish/run` is never called. The UI
  works; nothing executes it
- **Neon branches the database, not the Blob store.** This deployment shares its
  media library with the public production demo, so an image deleted here is deleted
  there

## Retiring it

Three steps, because closing the PR does none of them — a previously closed sandbox
PR was still serving its deployment three weeks after its branch was deleted:

1. close the PR and delete the branch
2. delete the preview deployment — `vercel remove <deployment-url> --yes`, targeting
   the immutable deployment URL, never the project name
3. delete the Neon branch for this git branch

Then request the branch alias and expect a 404. A 200 means the copy is still
reachable by anyone holding the project-wide protection-bypass secret. Nothing on
`main` is affected at any point.
