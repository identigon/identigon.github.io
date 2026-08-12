# Architecture Decision Records

Each ADR captures one significant, hard-to-reverse decision: the **context** that forced it, the
**decision** taken, and its **consequences** (including what was given up).

Conventions: numbered `NNNN-kebab-title.md`, never renumbered; `Status:` one of `proposed` /
`accepted` / `superseded by ADR NNNN`, with the date. A decision that reverses an ADR adds a new ADR
and marks the old one superseded rather than editing it.

| ADR                                              | Decision                                                                           |
| :----------------------------------------------- | :--------------------------------------------------------------------------------- |
| [0001](0001-separate-repo-not-a-subdirectory.md) | A separate `identigon.github.io` repo, not a subdirectory of `identigon/identigon` |
| [0002](0002-vitepress.md)                        | VitePress as the site generator                                                    |
