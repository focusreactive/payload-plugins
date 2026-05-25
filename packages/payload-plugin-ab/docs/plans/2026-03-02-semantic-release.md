# Semantic Release CI/CD Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fully automated versioning, changelog, and npm publish triggered on every merge to `main`.

**Architecture:** semantic-release analyzes conventional commits on push to `main`, determines the version bump, updates `CHANGELOG.md` and `package.json`, publishes to npm, and creates a GitHub Release — all in a single GitHub Actions workflow run.

**Tech Stack:** semantic-release, GitHub Actions, pnpm

---

### Task 1: Install semantic-release plugins

**Files:**
- Modify: `package.json` (devDependencies)

**Step 1: Install all plugins**

```bash
pnpm add -D semantic-release \
  @semantic-release/commit-analyzer \
  @semantic-release/release-notes-generator \
  @semantic-release/changelog \
  @semantic-release/npm \
  @semantic-release/git \
  @semantic-release/github
```

**Step 2: Verify they appear in devDependencies**

```bash
cat package.json | grep semantic
```

Expected: 7 `@semantic-release/*` entries plus `semantic-release` itself.

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: install semantic-release and plugins"
```

---

### Task 2: Create `.releaserc.json`

**Files:**
- Create: `.releaserc.json`

**Step 1: Create the config**

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/changelog", {
      "changelogFile": "CHANGELOG.md"
    }],
    "@semantic-release/npm",
    ["@semantic-release/git", {
      "assets": ["CHANGELOG.md", "package.json"],
      "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
    }],
    "@semantic-release/github"
  ]
}
```

Key notes:
- Plugin **order matters** — changelog must come before npm, git must come after npm
- `[skip ci]` in the commit message prevents the release commit from re-triggering the workflow
- `assets` tells `@semantic-release/git` which files to commit back

**Step 2: Validate JSON syntax**

```bash
node -e "JSON.parse(require('fs').readFileSync('.releaserc.json','utf8')); console.log('valid')"
```

Expected: `valid`

**Step 3: Commit**

```bash
git add .releaserc.json
git commit -m "chore: add semantic-release config"
```

---

### Task 3: Create GitHub Actions release workflow

**Files:**
- Create: `.github/workflows/release.yml`

**Step 1: Create the workflow directory**

```bash
mkdir -p .github/workflows
```

**Step 2: Create `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    branches:
      - main

permissions:
  contents: write
  issues: write
  pull-requests: write
  id-token: write

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: latest

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "lts/*"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npx semantic-release
```

Key notes:
- `fetch-depth: 0` — required so semantic-release can read full git history to find the last release tag
- `persist-credentials: false` — required so `@semantic-release/git` can push back using the `GITHUB_TOKEN` with write permissions
- `permissions: contents: write` — required for the git push back and GitHub Release creation

**Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add semantic-release GitHub Actions workflow"
```

---

### Task 4: Dry-run verification

**Step 1: Set a temporary NPM_TOKEN for local dry run**

```bash
export NPM_TOKEN=your_npm_token_here
export GITHUB_TOKEN=your_github_token_here
```

(You can get a GitHub token from Settings → Developer settings → Personal access tokens)

**Step 2: Run semantic-release in dry-run mode**

```bash
npx semantic-release --dry-run
```

Expected output includes something like:
```
[semantic-release] › … Running semantic-release version X.Y.Z
[semantic-release] › ✔  Allowed to push to the "main" branch
[semantic-release] › ℹ  Found git tag vX.Y.Z associated with version X.Y.Z
[semantic-release] › ℹ  The next release version is X.Y.Z
```

If no commits trigger a release (e.g., only `chore:` commits since last tag), you'll see:
```
[semantic-release] › ℹ  There are no relevant changes, so no new version is released.
```
That's fine — it means the config is working correctly.

**Step 3: If errors appear, common fixes**

- `ENOGHTOKEN` — GITHUB_TOKEN not set or missing `contents: write` permission
- `ENPMTOKEN` — NPM_TOKEN not set or token is expired/invalid
- Plugin order errors — check `.releaserc.json` plugin order matches Task 2

---

### Task 5: Push and verify CI

**Step 1: Push to main**

```bash
git push origin main
```

**Step 2: Watch the workflow**

Go to: `https://github.com/focusreactive/payload-plugin-ab/actions`

The `Release` workflow should appear. If commits since the last tag include `fix:` or `feat:`, a release will be created.

**Step 3: Verify release artifacts**

After a successful run:
- npm: `https://www.npmjs.com/package/@focus-reactive/payload-plugin-ab`
- GitHub Release: `https://github.com/focusreactive/payload-plugin-ab/releases`
- `CHANGELOG.md` committed to `main`
- `package.json` version bumped and committed to `main`

---

## Commit message reference (conventional commits)

| Commit | Version bump | Example |
|---|---|---|
| `fix: something` | patch (1.0.x) | `fix: cookie scope bug` |
| `feat: something` | minor (1.x.0) | `feat: add new adapter` |
| `feat!: something` or `BREAKING CHANGE:` in footer | major (x.0.0) | `feat!: remove old API` |
| `chore:`, `docs:`, `refactor:` | no release | — |
