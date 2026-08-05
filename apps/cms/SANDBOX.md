# Client content sandbox B

This branch exists only to hold open a preview deployment of `apps/cms` that a
prospect can log into and edit freely while they evaluate the CMS.

**Do not merge this PR.** On top of stock Ideal CMS, the branch adds a
programmatic-content evaluation feature set (entity-driven generated pages, an AI
generation/translation step with drafts as the review gate, and an extra content
locale) built for this evaluation only. It is not intended for `main`.

This repo is public, so the branch does not say which prospect it belongs to. The
mapping, along with the login we hand out, lives in the deal record.

## How it works

- the open PR keeps a Vercel preview deployment alive on this branch
- the Neon integration gives that deployment its own database branch, copied from
  the parent at the moment the branch was cut, so anything they change stays off
  the shared demo database
- live preview resolves against the deployment's own origin (`generatePreviewPath`
  returns a relative path), so the editing experience works on the preview domain
  with no extra configuration

Vercel crons only run on production deployments, so the hourly
`/api/scheduled-publish/run` job does not fire here. Scheduling a publish in this
sandbox stores the schedule and shows the UI, but nothing will execute it until
someone calls that endpoint.

## Retiring it

Close the PR and delete the branch. That drops the preview deployment and the Neon
branch with it. Nothing on `main` is affected.
