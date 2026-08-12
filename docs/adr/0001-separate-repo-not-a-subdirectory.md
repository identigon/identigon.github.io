# ADR 0001: A separate repo, not a subdirectory of `identigon/identigon`

Status: accepted (2026-08-11)

## Context

Identigon needed a public-facing site, primarily a landing/marketing page
(`https://identigon.github.io/`) with room to grow into hand-written guide content and, eventually,
links to generated reference material (Javadoc, etc.). Two options existed: a project-pages setup
inside `identigon/identigon` (served at `identigon.github.io/identigon/`), or the special
`<org>.github.io` repo name, which is the only way to get the bare root URL.

## Decision

Use a dedicated `identigon/identigon.github.io` repo. The clean root URL is the deciding factor —
it's specifically what that special repo name is for, and meaningfully better for a public front
door than a `/identigon/` path suffix.

Generated reference material (Javadoc, etc.) is **not** duplicated into this repo. It is expected to
be built and published from `identigon/identigon`'s own CI, tied to its release cadence, and linked
to from here — keeping exactly one source of truth for anything derived from the code, rather than
two repos that can drift out of sync.

## Consequences

- A second repo to maintain: its own `.gitattributes` / `.pre-commit-config.yaml` / ADRs / branch
  protection, independent of the monorepo's.
- The site's deploy cadence is decoupled from the monorepo's release cadence — copy or layout can
  change without a new library version, and vice versa.
- A different toolchain (Node/VitePress) stays out of the monorepo's Gradle-based CI, which has no
  reason to know about it.
- Reference material isn't available here until the monorepo actually publishes it — accepted
  deliberately, since copying it in would recreate the sync problem this decision avoids.
