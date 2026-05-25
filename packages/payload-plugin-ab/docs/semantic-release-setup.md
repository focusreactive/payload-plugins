# Semantic Release Setup Guide

Fully automated versioning, changelog, and npm publish on every merge to `main`.

**How it works:** Analyzes conventional commits (`fix:` → patch, `feat:` → minor, `feat!:` → major), bumps `package.json`, updates `CHANGELOG.md`, publishes to npm, creates a GitHub Release — all automatically.

---

## Step 1: Install plugins

```bash
pnpm add -D semantic-release \
  @semantic-release/commit-analyzer \
  @semantic-release/release-notes-generator \
  @semantic-release/changelog \
  @semantic-release/npm \
  @semantic-release/git \
  @semantic-release/github
```

---

## Step 2: Create `.releaserc.json`

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@semantic-release/changelog",
      {
        "changelogFile": "CHANGELOG.md"
      }
    ],
    "@semantic-release/npm",
    [
      "@semantic-release/git",
      {
        "assets": ["CHANGELOG.md", "package.json"],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }
    ],
    "@semantic-release/github"
  ]
}
```

---

## Step 3: Create `.github/workflows/release.yml`

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
          node-version: "24"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx semantic-release
```

> **Note:** No `NPM_TOKEN` needed — authentication is handled by npm Trusted Publishers via OIDC.

---

## Step 4: Add `publishConfig` to `package.json`

```json
"publishConfig": {
  "access": "public"
}
```

---

## Step 5: Publish the package once manually

Trusted Publishers requires the package to already exist on npm. If it's a brand new package, publish it once:

```bash
npm login   # if not logged in
npm publish --access public
```

> Skip this step if the package already exists on npm.

---

## Step 6: Configure Trusted Publishers on npmjs.com

1. Go to `https://www.npmjs.com/package/<your-package-name>`
2. **Settings** → **Trusted Publishers** → **Add publisher**
3. Fill in:

| Field             | Value                             |
| ----------------- | --------------------------------- |
| Repository owner  | your GitHub org or username       |
| Repository name   | your repo name (no `github.com/`) |
| Workflow filename | `release.yml`                     |
| Environment       | _(leave empty)_                   |

> **Common mistake:** Don't include `.github/workflows/` in the filename — just `release.yml`.

---

## Step 7: Commit and push

```bash
git add .releaserc.json .github/workflows/release.yml package.json
git commit -m "ci: add semantic-release with OIDC trusted publishing"
git push origin main
```

The first push will trigger the workflow. If there are `fix:` or `feat:` commits since the last git tag, a release will be published automatically.

---

## Commit message reference

| Prefix                         | Version bump              | Example                     |
| ------------------------------ | ------------------------- | --------------------------- |
| `fix:`                         | patch (`1.0.0` → `1.0.1`) | `fix: correct cookie scope` |
| `feat:`                        | minor (`1.0.0` → `1.1.0`) | `feat: add new adapter`     |
| `feat!:` or `BREAKING CHANGE:` | major (`1.0.0` → `2.0.0`) | `feat!: remove legacy API`  |
| `chore:`, `docs:`, `refactor:` | no release                | —                           |

---

## Troubleshooting

**`OIDC token exchange error - package not found`**
The package doesn't exist on npm yet, or the Trusted Publisher config is wrong. Complete Step 5 and double-check Step 6.

**`ENONPMTOKEN No npm token specified`**
OIDC failed and there's no fallback token. Re-check the Trusted Publisher config (Step 6).

**`EOTP` (one-time password required)**
An `NPM_TOKEN` is set but it's a regular token with 2FA. Either remove it (use OIDC only) or replace it with an Automation token.

**Push rejected after workflow runs**
semantic-release pushed the version bump commit to `main`. Pull before pushing:

```bash
git pull --rebase origin main && git push origin main
```
