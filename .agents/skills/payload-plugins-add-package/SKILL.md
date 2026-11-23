---
name: payload-plugins-add-package
description: Use when adding a new plugin package to this monorepo or doing its first (initial) npm release, or when the Release workflow fails with "ENONPMTOKEN No npm token specified" or "cannot publish over previously published versions" for a new package.
---

# Add a plugin package and do its first release

## How it works

CI (`.github/workflows/release.yml`, on every push to `main`) runs multi-semantic-release over every package that is not `private`.
For each package it finds the last git tag `@focus-reactive/<name>@<version>` and releases the commits since then.
CI authenticates to npm only through npm Trusted Publishing (OIDC), and npm can only attach a trusted publisher to a package that already exists.

So the first version is published by hand, and two things must exist before the package becomes non-private on `main`:

1. A trusted publisher for the package on npmjs.com.
2. The git tag of the hand-published version.

If the package lands on `main` as non-private without both, every Release run fails (`ENONPMTOKEN` or "cannot publish over previously published versions").
That failure blocks releases of all plugins, not just the new one.

## Order (do not reorder)

1. The plugin code is merged to `main` with `"private": true`.
2. A branch flips it to publishable. Open a PR, do not merge it.
3. Publish the first version from that branch, by hand.
4. Add the trusted publisher on npmjs.com.
5. Create the version tag on `main`.
6. Merge the PR.
7. The next `fix:`/`feat:`/`docs:` commit in the package is released by CI.

---

## 1. Package requirements

`packages/<name>/package.json`, while the plugin is being developed:

```json
{
  "name": "@focus-reactive/<name>",
  "version": "1.0.0",
  "private": true,
  "publishConfig": { "access": "public" },
  "repository": {
    "type": "git",
    "url": "https://github.com/focusreactive/payload-plugins",
    "directory": "packages/<name>"
  },
  "files": ["dist"],
  "scripts": { "build": "tsup" }
}
```

- `repository.url` must be exactly `https://github.com/focusreactive/payload-plugins`, with no `.git` suffix and no hyphen in `focusreactive`. Otherwise semantic-release fails with git error 128.
  When publishing, npm warns that it "normalized" this URL. That warning is harmless.
- Keep `"private": true` until step 6, so CI ignores the package (`--ignore-private-packages`).
- Use `1.0.0`: it is semantic-release's initial version and how the other plugins started.

## 2. Make it publishable (PR, not merged)

```bash
git checkout -b chore/<name>-first-publish origin/main
# in packages/<name>/package.json: "private": false, "version": "1.0.0"
git commit -am "chore(<name>): make the package publishable for its first 1.0.0 release"
git push -u origin HEAD
gh pr create ...   # say in the body: do not merge before the tag exists
```

Use `chore:` so merging it later does not trigger a release by itself.

Verify before publishing:

```bash
cd packages/<name>
bun run build && bun run test && bunx ultracite check
npm pack --dry-run   # expect only dist/, README.md, package.json; check name and version
```

## 3. First publish (by hand)

Needs an npm account with write access to the `@focus-reactive` scope.

```bash
npm whoami                       # 401 -> run `npm login` first
npm access list packages @focus-reactive | head -3   # expect read-write
cd packages/<name>
npm publish --access public
```

- npm asks for 2FA, either in the browser (press ENTER) or with an OTP. Agents: run it with `--otp=<code>` from the user, or ask the user to run it in their own terminal.
- In the user's own terminal, the command must not start with `!`. zsh reads `! cmd && npm publish` as a negation, and `npm publish` silently never runs.
- Success line: `+ @focus-reactive/<name>@1.0.0`. The registry can take a few minutes to show a new package:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://registry.npmjs.org/@focus-reactive%2f<name>   # 200 when visible
```

## 4. Trusted publisher (before merging)

npmjs.com -> `@focus-reactive/<name>` -> Settings -> Trusted Publisher -> GitHub Actions:

- Organization or user: `focusreactive`
- Repository: `payload-plugins`
- Workflow filename: `release.yml`
- Environment: leave empty

This is a web-only step; no CLI does it.
Without it, CI fails with `ENONPMTOKEN No npm token specified`.

## 5. Tag the published version

Tag the current `main` commit that holds the plugin code you published (not the step 2 PR commit, which is not on `main` yet).
Use the full SHA; a short one gives HTTP 422.

```bash
git fetch origin main
SHA=$(git rev-parse origin/main)
gh release create "@focus-reactive/<name>@1.0.0" \
  --target "$SHA" \
  --title "<name> v1.0.0" \
  --notes "Initial release" \
  --repo focusreactive/payload-plugins
```

## 6. Merge the PR

Merge the step 2 PR.
The Release run on the merge commit must succeed and release nothing for the package:

```bash
gh run list --repo focusreactive/payload-plugins --workflow release.yml --limit 1
```

## 7. First automated release

The workflow runs only on push to `main`; there is no manual trigger, and re-running a failed job does not help.
Push a `docs:`, `fix:` or `feat:` commit that touches a file inside `packages/<name>/` (a `chore:` commit releases nothing).
Expected result: the run publishes `1.0.1` (or `1.1.0` for `feat:`), `npm view @focus-reactive/<name> versions` lists it, and a GitHub release appears.

---

## Common mistakes

| Mistake | Error | Fix |
| --- | --- | --- |
| Merged non-private package before the trusted publisher was set | `ENONPMTOKEN No npm token specified`; Release fails for every package | Add the trusted publisher (step 4), then push any commit to `main` |
| Merged non-private package before the tag existed | "cannot publish over previously published versions: 1.0.0" | Create the tag (step 5), then push a new commit |
| Short SHA in `gh release create` | HTTP 422: target_commitish invalid | `git rev-parse` for the full SHA |
| Re-running the failed workflow job | "Local branch is behind remote - 0 packages released" | Push a new commit instead |
| Wrong `repository.url` | semantic-release git error 128 | Exactly `https://github.com/focusreactive/payload-plugins` |
| `chore:` commit to trigger a release | Nothing released | Use `docs:`, `fix:` or `feat:` |
| `! cd ... && npm publish` typed in a normal terminal | No output, nothing published | Drop the leading `!` |
