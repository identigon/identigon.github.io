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

- **Getting Started's example schema (`CUSTOMER`/`ORDERS`) reads as literal SQL, but Postgres folds
  unquoted identifiers to lower case.** A reader following along against a real database gets
  `customer`/`orders` and must lower-case policy keys to match. State that explicitly near the
  schema intro, or switch the example to lower case — the in-repo `quickstart/` walkthrough
  (`identigon/identigon`) already uses lower case, so there'd be nothing left to reconcile between
  the two.
- **State the salt's 16-byte minimum in the "Salt modes" table.** `IDENTIGON_SALT`
  (`persistent`/`reproducible` modes) must be at least 16 bytes; the page's own example
  (`"my-secret-salt-bytes"`) happens to clear it at 20 bytes, but the requirement itself isn't
  written down anywhere on the page. Pairs with a code-side fix tracked in `identigon/identigon`'s
  `PLAN.md` (`RunCommand` currently only fails on this mid-pipeline, not up front).
- **Explain how to produce the schema-identical target database.** The prerequisites list one as a
  requirement but never say how to make it. `pg_dump --schema-only --no-owner --no-privileges` is
  the answer for the supported engine (PostgreSQL) — worth stating explicitly, since getting it
  wrong by omitting `--schema-only` is silently catastrophic: `run` loads *into* the target rather
  than replacing it.
- **Link the role vocabulary, once `identigon/identigon` publishes it as a docs page** (tracked
  there). Today "see the role vocabulary" in the scaffold-output example (Getting Started §2/§3)
  points at nothing public — `ColumnRole`'s nine usable values and five reserved-and-fail-fast
  values currently exist only as Javadoc.
- **Link downloads for `identigon.jar` (the effigies CLI), `alterego.jar` and `incognito.jar`,
  once `identigon/identigon` builds the publishing step** (decided in ADR-0028 there: GitHub
  Packages plus mirrored, attested GitHub Release assets - not yet implemented). Getting Started
  currently assumes a clone-and-build; a direct, unauthenticated download would shorten that
  considerably.
- Generated reference docs (Javadoc for `alterego`/`incognito`) published from
  `identigon/identigon`'s own CI and linked in from here, once that exists — not copied into this
  repo (see "Decisions" above).
- Per-subproject pages (`alterego` / `incognito` / `effigies`) with more than the one-line
  feature-grid blurb, once there's more to say than the landing page's summary.
- Search (VitePress has built-in local search support) once there's enough content to search.
