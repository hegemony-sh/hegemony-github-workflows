// SPDX-FileCopyrightText: 2025-2026 Rexonix s.r.o.
// SPDX-FileContributor: Jakub Trávník <jakub.travnik@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// Shareable semantic-release configuration that plugin-release.yml passes with
// `--extends`, under the caller's .releaserc.json: the caller's own options
// win, and it sets none of these.
//
// conventional-commits-parser reads every line after a `BREAKING CHANGE:`
// footer as more of that note's text, up to the next note keyword. Git
// trailers sit after the footers (the DCO sign-off, an agent's
// Co-authored-by, Claude-Session), so they became part of the breaking-change
// note and were written into CHANGELOG.md, the release commit and the GitHub
// Release. finalizeContext below drops those lines from every note just before
// the notes are rendered.
//
// Only writerOpts is set. A top-level option reaches every plugin, and the
// commit analyzer reads parserOpts: teaching the parser about trailers there
// (as note keywords, say) would make each signed-off commit count as breaking.
// The conventionalcommits preset defines no finalizeContext of its own, so
// this one replaces nothing.

const TRAILER = /^\s*(?:co-authored-by|signed-off-by|claude-session)\s*:/i;

export function stripTrailers(text) {
  if (typeof text !== "string") {
    return text;
  }
  return text
    .split("\n")
    .filter((line) => !TRAILER.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function finalizeContext(context) {
  for (const group of context.noteGroups ?? []) {
    for (const note of group.notes ?? []) {
      note.text = stripTrailers(note.text);
    }
  }
  return context;
}

export default {
  writerOpts: { finalizeContext },
};
