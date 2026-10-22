<!--
SPDX-FileCopyrightText: 2025-2026 Jakub Trávník <jakub.travnik@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Security Policy

Security reports are handled privately. Please do not open a public GitHub issue for vulnerabilities, suspected vulnerabilities, leaked secrets, or exploit details.

This policy covers what this repository publishes: the reusable release workflow `plugin-release.yml` and the `release-tools/` lockfile of the semantic-release toolchain it installs. The workflow runs inside the plugin repositories' releases with their `RELEASE_TOKEN` and write access, so a flaw here, such as a script injection, a token that reaches a log or the disk too early, or a compromised package in the lockfile, can reach every repository that calls it. A vulnerability in the Hegemony platform itself is reported the same way; its own policy is in the [platform's SECURITY.md](https://github.com/hegemony-sh/hegemony/blob/develop/SECURITY.md).

## Supported versions

This repository has no releases or version numbers: callers pin a commit of `main`, and only `main` receives fixes. A fix reaches a plugin repository when that repository bumps its pin to a commit that contains it, so a fix here is not in effect there until the pin moves.

## Reporting a vulnerability

Report vulnerabilities privately by emailing [security@hegemony.sh](mailto:security@hegemony.sh).

Please include as much detail as you can safely share:

- Affected component (the workflow and the step in it, or a package in the `release-tools/` lockfile).
- Impact and attack scenario.
- Reproduction steps or proof-of-concept details.
- Affected commits, and how the workflow is called (the caller's `uses:` job, its permissions and inputs).
- Whether the issue is already public or under active exploitation.
- A safe way to contact you for follow-up.

Do not include production secrets, customer data, private keys, or exploit traffic from systems you do not own or have permission to test.

## Response targets

Maintainers aim to follow this timeline:

| Stage | Target |
| --- | --- |
| Acknowledge receipt | 48 hours |
| Initial triage and severity assessment | 7 days |
| Coordinated fix and disclosure target | 90 days |

These targets may vary based on severity, complexity, affected dependencies, maintainer availability, and responsible-disclosure coordination.

## Disclosure process

1. Maintainers acknowledge the report and establish a private coordination channel.
2. Maintainers validate the report, assess severity, and identify affected commits.
3. A fix, mitigation, or advisory is prepared privately.
4. Disclosure timing is coordinated with the reporter when possible.
5. Public details are published after a fix or mitigation is available, or after the coordinated disclosure window expires.

Each vulnerability is published as an advisory on this repository's [Security tab](https://github.com/hegemony-sh/hegemony-github-workflows/security/advisories), with the affected commits and the commit that fixes it, which the callers then pin.

## Safe harbor

Security research conducted in good faith is welcome. Please avoid privacy violations, service disruption, data destruction, persistence, social engineering, spam, and testing against systems you do not own or do not have permission to test.

## Secrets

If you believe a secret was committed or exposed, report it privately. Do not rotate, use, or test credentials unless they belong to you and you are authorized to do so.
