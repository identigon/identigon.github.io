# identigon.github.io

Source for the [Identigon](https://identigon.org) project site, built with
[VitePress](https://vitepress.dev/).

The actual `alterego` / `incognito` / `effigies` code lives in
[identigon/identigon](https://github.com/identigon/identigon); this repo is the public-facing
landing page only, and (eventually) hand-written guide content — generated reference material
(Javadoc etc.) is expected to be published from the monorepo's own CI and linked in from here,
rather than copied into this repo. See "Decisions" below for why this repo is separate at all, and
"Roadmap" for what's still outstanding.

## Local development

```sh
npm install
npm run docs:dev
```

## Build

```sh
npm run docs:build
npm run docs:preview
```

Publishing to GitHub Pages happens automatically via `.github/workflows/deploy.yml` on every push to
`main`.

## Decisions

Significant, hard-to-reverse calls made about this repo, and why.

**A separate repo, not a subdirectory of `identigon/identigon`** (2026-08-11) — Identigon needed a
public-facing site, primarily a landing/marketing page with room to grow into guide content and,
eventually, links to generated reference material. The special `<org>.github.io` repo name is the
only way to get the clean root URL (`identigon.org` rather than a `/identigon/`-suffixed path),
which was the deciding factor for a public front door. Generated reference material (Javadoc etc.)
is deliberately _not_ duplicated here — it's built and published from `identigon/identigon`'s own CI
and linked to, keeping exactly one source of truth for anything derived from the code. Trade-off: a
second repo to maintain (its own `.gitattributes`, pre-commit config, branch protection), on a
deploy cadence fully decoupled from the monorepo's release cadence, in a different toolchain
(Node/VitePress) that the monorepo's Gradle CI has no reason to know about.

**VitePress as the site generator** (2026-08-11) — the site needs to grow from a single landing page
into hand-written guide content without becoming hard to maintain. Considered: plain static HTML/CSS
(no templating once there's more than a couple of pages), and Jekyll (GitHub Pages' native option —
zero-config, no Actions workflow needed — but Ruby-based and increasingly dated). Chosen:
[VitePress](https://vitepress.dev/) — Markdown-first, matching how the rest of this project is
already written, with a built-in "home" layout and a reasonable out-of-the-box docs theme.
Trade-off: a Node/npm toolchain to keep updated, and (unlike Jekyll) a GitHub Actions deploy step
(`.github/workflows/deploy.yml`) as a single point of failure for publishing — accepted, since it's
a small, standard workflow.

## Roadmap

- Generated reference docs (Javadoc for `alterego`/`incognito`) published from
  `identigon/identigon`'s own CI and linked in from here, once that exists — not copied into this
  repo (see "Decisions" above).
- Per-subproject pages (`alterego` / `incognito` / `effigies`) with more than the one-line
  feature-grid blurb, once there's more to say than the landing page's summary.
- Search (VitePress has built-in local search support) once there's enough content to search.
