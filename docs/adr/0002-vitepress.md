# ADR 0002: VitePress as the site generator

Status: accepted (2026-08-11)

## Context

The site needs to grow from a single landing page into hand-written guide content (Getting Started,
About/architecture, eventually more) without becoming hard to maintain. Candidates considered: plain
static HTML/CSS (no build step, but no templating/layouts once there's more than a couple of pages),
Jekyll (GitHub Pages' native option — zero-config, no Actions workflow needed — but Ruby-based and
increasingly dated), and a modern static site generator.

## Decision

[VitePress](https://vitepress.dev/): Markdown-first content, matching how every other doc in this
project (`SPECIFICATION.md`, ADRs, `PLAN.md`) is already written; a built-in "home" layout for the
landing page; and a reasonable out-of-the-box docs theme (nav, sidebar) for when the guide content
grows. Unlike Jekyll, it has no native GitHub Pages support, so a GitHub Actions workflow builds and
deploys it (`.github/workflows/deploy.yml`).

## Consequences

- A Node/npm toolchain (`package.json`, `package-lock.json`) to keep updated, separate from the
  monorepo's Gradle one.
- Content authors write Markdown, not HTML — consistent with the rest of the project's
  documentation, and with how the Getting Started / About pages were actually written (verified
  against the monorepo's own source and ADRs, not invented).
- The GitHub Actions deploy step is a single point of failure for publishing (vs. Jekyll's native
  build) — accepted; it's a small, standard workflow (`actions/upload-pages-artifact` +
  `actions/deploy-pages`).
