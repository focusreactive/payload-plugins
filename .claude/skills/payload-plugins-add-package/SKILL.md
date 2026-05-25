---
name: payload-plugins-add-package
description: Use when adding or publishing a new plugin package in this monorepo, or when CI fails with "cannot publish over previously published versions" after a first manual publish.
---

# Add a New Plugin Package (payload-plugins)

## How it works

semantic-release decides what version to publish by finding the last git tag for the package. For new packages, you publish `1.0.0` manually once, then create the matching git tag — this anchors semantic-release's history. After that, all future releases are fully automated by CI.

## Prerequisites

- `gh` CLI authenticated (`gh auth status`)
- `npm` logged in (`npm whoami`)
- `bun` installed

---

## Steps

### 1. Create the package

In `packages/your-plugin-name/`, create `package.json` with these required fields:

```json
{
  "name": "@focus-reactive/your-plugin-name",
  "version": "1.0.0",
  "private": false,
  "publishConfig": { "access": "public" },
  "repository": {
    "type": "git",
    "url": "https://github.com/focusreactive/payload-plugins",
    "directory": "packages/your-plugin-name"
  },
  "scripts": {
    "build": "tsup"
  }
}
```

**Critical — `repository.url` must be exactly:**

```
https://github.com/focusreactive/payload-plugins
```

No `.git` suffix. Wrong URL → semantic-release fails with git error 128.

---

### 2. Build locally

```bash
cd packages/your-plugin-name
bun run build
```

Verify `dist/` exists before publishing.

---

### 3. First manual publish

From inside the package directory:

```bash
npm publish --access public
```

This creates `1.0.0` on npm. npm may warn about normalizing `repository.url` — that's fine, not an error.

---

### 4. Link repo as trusted publisher on npm

Required so CI can publish with provenance (`"provenance": true` in `.releaserc.json`).

1. Go to [npmjs.com](https://npmjs.com) → your package → **Settings**
2. Under **Publishing** → **Trusted Publishers**
3. Add GitHub Actions: repo `focusreactive/payload-plugins`, workflow `release.yml`

---

### 5. Create the git tag + GitHub release

This is the critical step. Without it, semantic-release thinks `1.0.0` was never released, tries to publish it again, and CI fails.

Find the full SHA of the commit that represents your `1.0.0` state (the last commit before any docs/fix commits you intend to be the first automated release):

```bash
git log --oneline | head -10   # find the right commit
git rev-parse <short-sha>       # get full SHA — required, short SHA causes HTTP 422
```

Create the release:

```bash
gh release create "@focus-reactive/your-plugin-name@1.0.0" \
  --target <full-sha> \
  --title "your-plugin-name v1.0.0" \
  --notes "Initial release" \
  --repo focusreactive/payload-plugins
```

---

### 6. Trigger the first automated release

The release workflow **only runs on push to main** — it cannot be triggered manually (`workflow_dispatch` is not configured). Push a `docs:` or `fix:` commit touching a file inside the package:

```bash
# e.g. edit packages/your-plugin-name/README.md
git commit -m "docs(your-plugin-name): trigger first automated release"
git push
```

---

### 7. Verify

- GitHub Actions → Release workflow → should show `1.0.1` published
- `npm view @focus-reactive/your-plugin-name versions` → should list `["1.0.0", "1.0.1"]`
- GitHub Releases → new release `@focus-reactive/your-plugin-name@1.0.1` should appear

---

## Common Mistakes

| Mistake                          | Error                                                      | Fix                                       |
| -------------------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| Missing git tag before CI        | "cannot publish over previously published versions: 1.0.0" | Run step 5 (`gh release create`)          |
| Short SHA in `gh release create` | HTTP 422: target_commitish invalid                         | Use full SHA: `git rev-parse <short-sha>` |
| Re-running failed workflow job   | "Local branch is behind remote — 0 packages released"      | Push a new commit instead (step 6)        |
| Wrong `repository.url`           | semantic-release git error 128                             | Must match exactly, no `.git` suffix      |
| `chore:` commit to test release  | No release triggered                                       | Use `docs:`, `fix:`, or `feat:`           |
| Trusted publisher not set up     | CI publish fails with 401/403                              | Complete step 4 on npmjs.com              |
