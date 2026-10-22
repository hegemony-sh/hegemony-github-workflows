<!--
SPDX-FileCopyrightText: 2025-2026 Jakub Trávník <jakub.travnik@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Contributing

This repository is part of the Hegemony project: the reusable GitHub Actions
workflow the plugin repositories call for their releases, and the
semantic-release toolchain lockfile it installs. See the [README](README.md)
for the contract between the workflow and its callers.

## Code of Conduct and security

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

Report vulnerabilities privately through the process in
[SECURITY.md](SECURITY.md), by email to
[security@hegemony.sh](mailto:security@hegemony.sh). Do **not** open public
issues for vulnerabilities, leaked secrets, exploit details, or suspected
compromise.

## Licensing and DCO

The source is licensed under `AGPL-3.0-or-later`. Your contribution is licensed
under the same terms, and contributing it transfers no copyright to the
project. There is no Contributor License Agreement.

Every commit must be signed off under the
[Developer Certificate of Origin](https://developercertificate.org/) (DCO),
version 1.1. A `Signed-off-by:` line certifies that you wrote the change, or
otherwise have the right to submit it under the project licence. Sign off with
`git commit -s`. The DCO GitHub App checks every commit in a pull request: the
sign-off's name and email must match the commit's author. Merge
commits and commits by GitHub bot accounts are skipped. To add a missing
sign-off to every commit on your branch, run
`git rebase --signoff origin/main` and force-push the branch.

A commit written by an AI coding agent is signed off by the person who directs
the agent and submits the work, as its author; the agent is credited in a
`Co-authored-by:` trailer and never signs off in its own name. See the
platform's
[CONTRIBUTING.md](https://github.com/hegemony-sh/hegemony/blob/develop/CONTRIBUTING.md#licensing-and-dco).

## Changes reach callers by pin

The plugin repositories call `plugin-release.yml` by a full commit SHA, and the
workflow checks out `release-tools/` at that same SHA. Merging a pull request
here therefore changes no caller: it takes effect in a plugin repository only
when that repository bumps its pin, in a pull request reviewed there. The
workflow receives the callers' `RELEASE_TOKEN`, so review a change to it as
code that runs with that token. Keep the [README](README.md), which states the
inputs, secrets and permissions, in step with the workflow, and pin every
action by its full commit SHA with a version comment.

Dependabot proposes the `release-tools/` lockfile and action bumps weekly;
they are reviewed like any other change.

## Local setup and checks

You need [uv](https://docs.astral.sh/uv/), Node.js with npm (CI uses 22) and
[pre-commit](https://pre-commit.com/). CI runs these, and a pull request needs
them green:

```bash
uvx reuse@6.2.0 lint
uvx zizmor@1.22.0 --offline .github/workflows
(cd release-tools && npm ci --ignore-scripts --no-audit --no-fund)
```

`pre-commit install` installs the hooks: REUSE, zizmor, the secret scan
(gitleaks), a typo scan and the commit message lint. `pre-commit run
--all-files` runs them on the whole tree. CI also lints the commit messages of
the pull request, and scans the commits it adds for secrets.

Every new file carries an SPDX header, as the existing ones do, so that
`reuse lint` passes. A file that cannot carry one gets an entry in
`REUSE.toml`. Markdown follows the rules in `.markdownlint-cli2.jsonc`
(`npx markdownlint-cli2 '*.md'`); CI does not run that check.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/);
`commitlint.config.mjs` holds the rules. Nothing here is released from them:
the type and scope only keep the history readable.
