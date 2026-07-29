# Holcim Foundation content sandbox

This branch exists only to hold open a preview deployment of `apps/cms` that the
Holcim Foundation team can log into and edit freely during their CMS evaluation.

**Do not merge this PR, and do not push code changes here.** It carries no code
diff from `main` on purpose: what the client sees has to be stock Ideal CMS, not a
work in progress.

## How it works

- the open PR keeps a Vercel preview deployment alive on this branch
- the Neon integration gives that deployment its own database branch, copied from
  the parent at the moment the branch was cut, so anything the client changes stays
  off the shared demo database
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

Credentials and the client-facing links are recorded with the deal, not here.
