<!--
SPDX-FileCopyrightText: 2025-2026 Jakub Trávník <jakub.travnik@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

# hegemony-workflows

Reusable GitHub Actions workflows shared by the Hegemony repositories. The
repository's Actions access is set to "accessible from repositories in the
organization", which is what lets a private caller use a workflow from here.

## `plugin-release.yml` — release a plugin repository on merge to `main`

`.github/workflows/plugin-release.yml` is the release-on-merge pipeline of the
four plugin repositories (`hegemony-inventory-plugins`,
`hegemony-notification-plugins`, `hegemony-secret-plugins`,
`hegemony-step-plugins`). It is the same approach the host platform uses in
its own `release.yml`: [semantic-release](https://semantic-release.gitbook.io/)
reads the Conventional Commits since the last tag, derives the next version,
and only then bumps, builds, commits, tags and publishes. When nothing since
the last tag is releasable the run ends without a release.

### Calling it

```yaml
name: Release

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions: {}

jobs:
  release:
    name: Release
    if: "!contains(github.event.head_commit.message, '[skip ci]')"
    uses: hegemony-sh/hegemony-workflows/.github/workflows/plugin-release.yml@main
    permissions:
      contents: write
      id-token: write
      attestations: write
    secrets:
      RELEASE_TOKEN: ${{ secrets.RELEASE_TOKEN }}
```

The job's check runs show up as `Release / Semantic Release` and, on public
repositories that released something, `Release / Attest Release Assets`.

### Inputs

| Input | Default | Purpose |
|---|---|---|
| `python-version` | `"3.12"` | Handed to `actions/setup-python`. |
| `uv-version` | `"0.9.28"` | Handed to `astral-sh/setup-uv`. Keep it equal to the caller's `ci.yml` pin so the release refreshes `uv.lock` with the resolver CI validated. |
| `node-version` | `"20"` | Runs semantic-release. |

### Secrets

| Secret | Required | Purpose |
|---|---|---|
| `RELEASE_TOKEN` | yes | PAT (or GitHub App token) with `contents: read+write` on the caller, whose owner is a bypass actor of the caller's `main` ruleset. semantic-release pushes the release commit and tag with it and creates the GitHub Release with it. The built-in `GITHUB_TOKEN` cannot bypass rulesets, even with `contents: write`, and a release commit pushed with it would not trigger other workflows. |

The workflow fails fast, with a message that says what to add, when the
secret arrives empty.

### Permissions

The workflow declares `permissions: {}` and each job asks for what it needs:
`contents: write` for the release job, `id-token: write` plus
`attestations: write` for the attest job only. A called workflow can only
narrow what its caller grants, so the caller's `uses:` job must grant the
union shown above.

### What the caller must contain

| Path | Role |
|---|---|
| `.releaserc.json` | The semantic-release configuration. It is what runs the scripts below (through `@semantic-release/exec`), lists the files the release commit carries (`@semantic-release/git`) and the assets the GitHub Release gets (`@semantic-release/github`). |
| `scripts/set_version.py X.Y.Z` | Sets one version across every package `pyproject.toml`, the SDK pins and the SDK `_version.py`. |
| `scripts/verify_release_version.py vX.Y.Z` | Fails when any package disagrees with the version about to be released. |
| `scripts/build_wheels.py` | Builds every workspace wheel into `dist/`. |
| `scripts/smoke_install_wheels.py` | Optional; installs the wheels into a clean venv and imports them. |
| `uv.lock` | Refreshed by `uv lock` inside the release and committed with the bump. |
| `CHANGELOG.md` | Prepended on every release by `@semantic-release/changelog`. |

The steps the workflow runs before `npx semantic-release` are: checkout with
full history and no persisted credentials, `origin` re-pointed at an
`x-access-token` URL built from `RELEASE_TOKEN`, Python, uv,
`uv sync --frozen --all-packages`, Node.js, and the pinned semantic-release
packages (`semantic-release@24`, `commit-analyzer@13`,
`release-notes-generator@14`, `changelog@6`, `exec@6`, `git@10`,
`github@11`) plus the `conventional-changelog-conventionalcommits@8` preset,
which is what makes a bare `feat!:` / `fix!:` count as a breaking change (the
default angular preset does not parse the marker). A `.releaserc.json` may
only name plugins and presets from that list.

The plugin repositories' `.releaserc.json` chain, in `prepareCmd`:
`set_version.py` → `uv lock` → `verify_release_version.py` → `build_wheels.py`
→ `smoke_install_wheels.py` → `sha256sum *.whl > SHA256SUMS` inside `dist/`;
and in `verifyReleaseCmd` they refuse to continue when a GitHub Release for
the next tag already exists, so a release is never overwritten. Their
`successCmd` writes `NEW_RELEASE=true` and `NEW_RELEASE_VERSION` to
`GITHUB_ENV`, which is how this workflow learns a release happened.

### Provenance

When a release happened and the repository is public, a second job downloads
the assets from the run and attests `dist/*.whl` and `dist/SHA256SUMS` with
`actions/attest`. Private repositories cannot attest, so the job is skipped
there and switches itself on the moment the repository goes public. Verify
with `gh attestation verify --repo hegemony-sh/<repo> <wheel>`.

### Concurrency

`concurrency: release-${{ github.repository }}` with `cancel-in-progress:
false`: a second merge queues behind a running release rather than racing it
or cancelling it.
