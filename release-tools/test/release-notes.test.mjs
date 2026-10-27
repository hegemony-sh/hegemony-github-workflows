// SPDX-FileCopyrightText: 2025-2026 Rexonix s.r.o.
// SPDX-FileContributor: Jakub Trávník <jakub.travnik@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// Renders release notes the way a plugin release does: the
// release-notes-generator plugin with the conventionalcommits preset, its
// options merged as semantic-release merges an `--extends` config under the
// caller's plugin options. Run with `npm test` in release-tools/.

import assert from "node:assert/strict";
import { test } from "node:test";

import { generateNotes } from "@semantic-release/release-notes-generator";

import shared, { stripTrailers } from "../release-notes.mjs";

const TRAILER_LINE = /^\s*(?:co-authored-by|signed-off-by|claude-session)\s*:/im;

const COMMITS = [
  {
    hash: "1111111111111111111111111111111111111111",
    message: [
      "feat(api)!: drop the v1 endpoints",
      "",
      "The v1 handlers are gone.",
      "",
      "BREAKING CHANGE: clients must call /v2.",
      "Migrate before upgrading.",
      "",
      "Signed-off-by: Jane Doe <jane@example.invalid>",
      "Co-Authored-By: Claude <noreply@anthropic.com>",
      "Claude-Session: https://claude.ai/code/session_example",
    ].join("\n"),
  },
  {
    hash: "2222222222222222222222222222222222222222",
    message: [
      "fix: keep the config reader quiet",
      "",
      "BREAKING CHANGE: the --verbose flag is removed",
      "co-authored-by: Someone <someone@example.invalid>",
      "",
      "",
      "Signed-off-by: Jane Doe <jane@example.invalid>",
    ].join("\n"),
  },
  {
    hash: "3333333333333333333333333333333333333333",
    message: "fix: plain fix\n\nSigned-off-by: Jane Doe <jane@example.invalid>",
  },
];

function render(pluginOptions) {
  const logger = { log() {}, warn() {}, error() {}, success() {} };
  return generateNotes(
    // What semantic-release hands the plugin: global options, then the
    // caller's plugin options on top (see semantic-release's plugins/normalize).
    { ...shared, preset: "conventionalcommits", ...pluginOptions },
    {
      cwd: process.cwd(),
      env: {},
      logger,
      commits: COMMITS,
      lastRelease: { gitTag: "v0.1.0", gitHead: "0".repeat(40) },
      nextRelease: { gitTag: "v0.2.0", gitHead: COMMITS[0].hash, version: "0.2.0" },
      options: { repositoryUrl: "https://github.com/hegemony-sh/example.git" },
    },
  );
}

test("the preset alone leaks trailers into breaking-change notes", async () => {
  const notes = await render({ writerOpts: undefined });
  assert.match(notes, TRAILER_LINE, "fixture no longer reproduces the leak; revisit the fix");
});

test("rendered notes keep the breaking changes and drop every trailer", async () => {
  const notes = await render({});
  assert.doesNotMatch(notes, TRAILER_LINE);
  assert.match(notes, /### ⚠ BREAKING CHANGES/);
  assert.match(notes, /clients must call \/v2\.\nMigrate before upgrading\./);
  assert.match(notes, /the --verbose flag is removed/);
  assert.match(notes, /plain fix/);
  assert.doesNotMatch(notes, /\n{3,}\S/, "trailer removal left a run of blank lines");
});

test("stripTrailers leaves other text alone", () => {
  assert.equal(stripTrailers("a\n\nb"), "a\n\nb");
  assert.equal(stripTrailers("see Signed-off-by: in the docs"), "see Signed-off-by: in the docs");
  assert.equal(stripTrailers("a\n\nSigned-off-by: x\n\nb"), "a\n\nb");
  assert.equal(stripTrailers(undefined), undefined);
});
