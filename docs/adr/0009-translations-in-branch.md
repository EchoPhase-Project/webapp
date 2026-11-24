# 0009. When a branch may add translations instead of Weblate

- Status: Accepted
- Date: 2026-11-24

## Context

English is the source language. New keys go only into the English files,
and translators add the other languages in Weblate, which reads `main`.
Until a key reaches `main` and a translator picks it up, other languages
show the English fallback. For a short, visible string (a button in the
top bar) that looked broken on the Russian page right after a release.

## Decision

The rule stays: new keys go into the English files, and Weblate supplies
the rest. As an exception, the maintainer may decide that a branch adds
the other languages for a few short strings, so that the release ships
complete. The commit says that it does so in place of Weblate. This was
done once, for the sign-in and link texts (Russian and Romanian).

## Alternatives considered

- Always waiting for Weblate: correct, but visible strings stay in English
  for a while after a release.
- Always writing all languages in the branch: bypasses translators and
  review, and the quality of machine-made translations varies.

## Consequences

- Translators may later change such strings in Weblate as usual.
- The exception needs the maintainer's decision each time; it is not a
  default for agents.
