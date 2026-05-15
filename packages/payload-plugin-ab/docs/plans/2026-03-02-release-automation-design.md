# Release Automation Design

**Date:** 2026-03-02
**Status:** Approved

## Goal

Fully automated release pipeline triggered on every merge to `main`. Bumps version, generates changelog, publishes to npm, and creates a GitHub Release — zero manual steps.

## Tool: semantic-release

### Plugins

| Plugin                                      | Purpose                                           |
| ------------------------------------------- | ------------------------------------------------- |
| `@semantic-release/commit-analyzer`         | Determines version bump from conventional commits |
| `@semantic-release/release-notes-generator` | Formats release notes                             |
| `@semantic-release/changelog`               | Writes/updates `CHANGELOG.md`                     |
| `@semantic-release/npm`                     | Bumps `package.json` + publishes to npm           |
| `@semantic-release/git`                     | Commits version bump + CHANGELOG back to main     |
| `@semantic-release/github`                  | Creates GitHub Release                            |

### Version Bump Rules

| Commit prefix                | Bump  |
| ---------------------------- | ----- |
| `fix:`                       | patch |
| `feat:`                      | minor |
| `BREAKING CHANGE:` in footer | major |

## Files

- `.releaserc.json` — semantic-release configuration
- `.github/workflows/release.yml` — GitHub Actions workflow

## Workflow Steps (on push to main)

1. Checkout repo (full history)
2. Setup Node + pnpm
3. `pnpm install --frozen-lockfile`
4. `pnpm build`
5. `npx semantic-release`

## Secrets Required

- `NPM_TOKEN` — added manually to GitHub repo secrets
- `GITHUB_TOKEN` — provided automatically by GitHub Actions
