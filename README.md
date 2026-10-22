<!--
SPDX-FileCopyrightText: 2025-2026 Jakub Trávník <jakub.travnik@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

# hegemony-github-workflows

Reusable GitHub Actions workflows shared by the Hegemony repositories.

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
    uses: hegemony-sh/hegemony-github-workflows/.github/workflows/plugin-release.yml@<commit-sha> # main
    permissions:
      contents: write
      id-token: write
      attestations: write
      artifact-metadata: write
    secrets:
      RELEASE_TOKEN: ${{ secrets.RELEASE_TOKEN }}
```

The job's check runs show up as `Release / Semantic Release` and, on public
repositories that released something, `Release / Attest Release Assets`.

### Pinning

Callers reference this workflow by a full commit SHA, never by branch: the
called code receives `RELEASE_TOKEN` and the release job's write permission,
so what runs must be exactly what was reviewed. The trailing `# main` comment
says which branch the pin was taken from. A change merged here changes no
caller: it reaches one only when that caller bumps the SHA in its `release.yml`,
in a pull request reviewed there (the
`git ls-remote https://github.com/hegemony-sh/hegemony-github-workflows main` line
gives the current head). The release toolchain in `release-tools/` is
checked out at that same SHA, so a pin bump moves the workflow and its
dependency lockfile together.

### Inputs

| Input | Default | Purpose |
|---|---|---|
| `python-version` | `"3.12"` | Handed to `actions/setup-python`. |
| `uv-version` | `"0.9.28"` | Handed to `astral-sh/setup-uv`. Keep it equal to the caller's `ci.yml` pin so the release refreshes `uv.lock` with the resolver CI validated. |
| `node-version` | `"24"` | Runs semantic-release. The `release-tools` lockfile needs 22.22.2 or later on the 22 line, or 24.15 or later. |

### Secrets

| Secret | Required | Purpose |
|---|---|---|
| `RELEASE_TOKEN` | yes | PAT (or GitHub App token) with `contents: read+write` on the caller and `contents: read` on this repository, whose owner is a bypass actor of the caller's `main` ruleset. The workflow fetches `release-tools/` from here with it, and semantic-release pushes the release commit and tag with it and creates the GitHub Release with it. The built-in `GITHUB_TOKEN` cannot bypass rulesets, even with `contents: write`, and a release commit pushed with it would not trigger other workflows. |

The workflow fails fast, with a message that says what to add, when the
secret arrives empty.

### Permissions

The workflow declares `permissions: {}` and each job asks for what it needs:
`contents: write` for the release job; `id-token: write`,
`attestations: write` and `artifact-metadata: write` (the storage record
`actions/attest` v4 creates) for the attest job only. A called workflow can
only narrow what its caller grants, so the caller's `uses:` job must grant the
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

The steps the workflow runs before semantic-release are, in order: checkout
of the caller with full history and no persisted credentials; Python, uv and
`uv sync --frozen --all-packages`; Node.js; a sparse checkout of this
repository's `release-tools/` at the workflow's own commit; `npm ci
--ignore-scripts` in it, which installs exactly `package-lock.json` (the
semantic-release core, the `commit-analyzer`, `release-notes-generator`,
`changelog`, `exec`, `git` and `github` plugins, and the
`conventional-changelog-conventionalcommits` preset, which is what makes a
bare `feat!:` / `fix!:` count as a breaking change; the default angular preset
does not parse the marker); and only then `origin` re-pointed at an
`x-access-token` URL built from `RELEASE_TOKEN`. Nothing installed can read
the token: it is written after every install, and package lifecycle scripts
never run. A `.releaserc.json` may only name plugins and presets from that
lockfile.

The plugin repositories' `.releaserc.json` chain, in `prepareCmd`:
`set_version.py` → `uv lock` → `verify_release_version.py` → `build_wheels.py`
→ `smoke_install_wheels.py` → `sha256sum *.whl > SHA256SUMS` inside `dist/`;
and in `verifyReleaseCmd` they refuse to continue when a GitHub Release for
the next tag already exists, so a release is never overwritten. Their
`successCmd` writes `NEW_RELEASE=true` and `NEW_RELEASE_VERSION` to
`GITHUB_ENV`, which is how this workflow learns a release happened.

### Provenance

When a release happened and the calling repository is public, a second job
downloads the assets from the run and attests `dist/*.whl` and
`dist/SHA256SUMS` with `actions/attest`. Private repositories cannot attest, so
the job is skipped there and runs by itself once the caller is public. Verify
with `gh attestation verify --repo hegemony-sh/<repo> <wheel>`.

### Recovering a tag without a Release

semantic-release pushes the release commit and the `vX.Y.Z` tag before it
publishes the GitHub Release. If publication fails after that push (an API
outage, a bad token), the tag exists and the Release does not, and a re-run
will not repair it: semantic-release reads the tag as the last release and
finds nothing new. The fix is to publish that tag's assets by hand, from a
checkout of the tag:

```bash
git fetch --tags origin && git checkout vX.Y.Z
uv sync --frozen --all-packages
uv run --no-sync python scripts/build_wheels.py && (cd dist && sha256sum *.whl > SHA256SUMS)
gh release create vX.Y.Z --verify-tag --title vX.Y.Z \
  --notes "$(awk '/^## /{n++} n==1' CHANGELOG.md)" dist/*.whl dist/SHA256SUMS
```

`--verify-tag` refuses to create a tag that is not already on the remote, so
the command cannot mint a version by accident; the notes are the newest
`CHANGELOG.md` section, which the failed run already committed. The
`verifyReleaseCmd` immutability guard in the callers' `.releaserc.json` keeps
the next automatic run from touching that version again.

### Concurrency

`concurrency: release-${{ github.repository }}` with `cancel-in-progress:
false`: a second merge queues behind a running release rather than racing it
or cancelling it.

## Checks

CI runs on every pull request and every push to `main`: a Conventional Commits
lint of the pull request's commits, a secret scan (gitleaks) and a workflow
scan (zizmor), REUSE licence lint, and a release toolchain check. That check
installs `release-tools/` with `npm ci --ignore-scripts --engine-strict` on the
`node-version` default, then dry-runs a release in a throwaway repository, so a
lockfile that no longer installs, no longer runs on that Node.js, or no longer
renders release notes fails the pull request rather than a plugin release.
[CONTRIBUTING.md](CONTRIBUTING.md) shows how to run them locally, and
[SECURITY.md](SECURITY.md) how to report a vulnerability.

## Licence

`AGPL-3.0-or-later`; see [LICENSE](LICENSE). The repository follows the
[REUSE](https://reuse.software/) specification: each file carries an SPDX
header, or an entry in `REUSE.toml` where it cannot.
