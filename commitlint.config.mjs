// SPDX-FileCopyrightText: 2025-2026 Jakub Trávník <jakub.travnik@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// Conventional Commits — commitlint configuration
// Docs: https://commitlint.js.org/reference/configuration.html
//
// JavaScript rather than YAML because `ignores` only accepts predicate
// functions, which YAML cannot express. .mjs specifically:
// wagoid/commitlint-github-action rejects a .js configFile.

// Dependabot titles its commits `chore(deps): Bump ...` (the prefix comes from
// .github/dependabot.yml, the capital B is Dependabot's own, against
// subject-case) and fills the body with release-note links far past
// body-max-line-length. Neither is configurable, so these commits would fail
// the lint on every Dependabot pull request. The match is on the whole
// `chore(deps): Bump ` prefix: `chore(deps): update ...` is still linted.
const DEPENDABOT_BUMP = /^chore\(deps\): Bump \S/;

// Scopes are free-form, so nobody has to look up a list: one or more
// comma-separated names (ci, deps, release-tools), each lower-case letters,
// digits and single dashes, at most SCOPE_MAX_LENGTH characters. A fixed list
// kept rejecting new areas and sending authors to reword and force-push. Same
// rule as the plugin repositories and the Hegemony host repository.
const SCOPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SCOPE_MAX_LENGTH = 20;

function scopeFormat({ scope }) {
  if (!scope) {
    return [true];
  }
  const bad = scope
    .split(",")
    .filter((name) => !SCOPE.test(name) || name.length > SCOPE_MAX_LENGTH);
  return [
    bad.length === 0,
    `scope names must be lower-case letters, digits and single dashes, at most ` +
      `${SCOPE_MAX_LENGTH} characters, comma-separated without spaces ` +
      `(e.g. ci, release-tools, ci,docs); not: ${bad.map((name) => JSON.stringify(name)).join(", ")}`,
  ];
}

export default {
  extends: ["@commitlint/config-conventional"],

  plugins: [{ rules: { "scope-format": scopeFormat } }],

  ignores: [(message) => DEPENDABOT_BUMP.test(message.split("\n")[0])],

  rules: {
    // Any scope, in one shape: see SCOPE above.
    "scope-format": [2, "always"],
  },
};
