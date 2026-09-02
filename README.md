# identigon.github.io

Source for the [Identigon](https://identigon.org) project site, built with
[VitePress](https://vitepress.dev/).

The actual `alterego` / `incognito` / `effigies` code lives in
[identigon/identigon](https://github.com/identigon/identigon); this repo is the public-facing
landing page only, and (eventually) hand-written guide content — generated reference material
(Javadoc etc.) is expected to be published from the monorepo's own CI and linked in from here,
rather than copied into this repo. This repo's own decisions and backlog live in
`identigon/identigon`'s `docs/adr/` and `PLAN.md` instead, not here - see that repo's
[`DOC-MAP.md`](https://github.com/identigon/identigon/blob/main/DOC-MAP.md).

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
