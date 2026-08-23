# identigon.github.io — Instructions for Implementation Agents

The public-facing site for the Identigon project, at <https://identigon.org> (identigon.github.io
also resolves but isn't canonical — see "Custom domain"). Built with
[VitePress](https://vitepress.dev/). Separate repo from `identigon/identigon` (the
alterego/incognito/effigies monorepo) — see [`README.md`'s Decisions section](README.md#decisions)
for why; don't merge the two, or move content between them, without a real decision.

## What lives here

- `docs/index.md` — the landing/home page.
- `docs/getting-started.md`, `docs/about.md` — hand-written guide content.
- `docs/.vitepress/config.mts` — site nav/config.
- `docs/public/CNAME` — the custom domain marker; see "Custom domain" before touching it.

`docs/` is VitePress's `srcDir` — every `.md` file under it becomes a public page, linked or not.
Keep it to hand-written guide content; decisions and outstanding work belong in `README.md`'s
`## Decisions` / `## Roadmap` sections, however doc-kit-shaped a `docs/` subtree might look.

Generated reference material (Javadoc, etc.) isn't duplicated here — published from
`identigon/identigon`'s CI and linked to (see README.md's Decisions).

## Accuracy

Anything describing what the CLI/libraries do or produce (commands, flags, env vars, formats, sample
output) must be verified against source in a clone of `identigon/identigon`, not guessed — e.g.
Getting Started's `discover`/`scaffold`/`run` output came from reading `DiscoverCommand.java`,
`ScaffoldCommand.java`, `RunCommand.java`, and effigies' `PolicyInferrer.java` directly. Flag
anything unverifiable rather than asserting it.

## Custom domain (identigon.org)

DNS and the GitHub Pages `cname` setting point `identigon.org` here. DNS is on Cloudflare in **"DNS
only"** mode — the proxy must stay off. Two easy ways to break this unnoticed:

- **Don't re-enable the Cloudflare proxy.** It re-terminates TLS with Cloudflare's own cert instead
  of GitHub's, and can break GitHub's Let's Encrypt validation. The site still loads over HTTPS
  either way, so browser/`curl` checks won't catch it — check the served certificate's issuer if the
  domain is touched.
- **`docs/public/CNAME` (contents: `identigon.org`) must ship in every build.** VitePress copies
  `docs/public/*` into `dist`, and Pages needs it present in every deploy to keep honouring the
  domain — not inert config, don't delete it.
- To force immediate cert re-issuance after a DNS change instead of waiting for GitHub's retry
  cycle: `gh api repos/identigon/identigon.github.io/pages -X PUT -F cname=null` then
  `-F cname=identigon.org`.

## Build and test

```sh
npm install
npm run docs:dev       # hot-reload preview, http://localhost:5173/
```

Scripts are in `package.json`. `format`/`format:check` (Prettier) are scoped to `*.md` only
(`.prettierrc.json`'s `overrides`); `format:check` also runs as a pre-commit hook.

Publishing is automatic via `.github/workflows/deploy.yml` on every push to `main` — no
release/version step (see `README.md`'s Decisions for why there's no `CHANGELOG.md`/
`SPECIFICATION.md`).

The `identigon` org requires every `uses:` pinned to a full commit SHA, **transitively**: a
composite action's internal `uses:` can be unpinned even when the top-level one isn't, failing at
startup with no job and no log pointing at the cause. If a freshly-pinned workflow still won't
start, check the failing action's `action.yml` for an unpinned internal `uses:`. After
adding/bumping any Action, run `pinact run -u` (bump-then-pin — plain `pinact run` only re-pins
what's already there).

`deploy` sets `NODE_OPTIONS: --use-system-ca` because `actions/deploy-pages` uses Node's bundled CA
list instead of the runner's trust store, otherwise failing with a "self-signed certificate" error —
a Node/runner quirk, not org-specific (the first guess was wrong; see the comment in `deploy.yml`).

GitHub also defaults a new `<org>.github.io` repo to legacy Jekyll branch-build mode on first Pages
enable, not Actions-driven — if Pages settings are ever reset:
`gh api repos/identigon/identigon.github.io/pages -X PUT -f build_type=workflow`.

## Git

- Never run `git commit` or `git push` unless explicitly asked. Present the changes and a suggested
  commit message, then wait.
