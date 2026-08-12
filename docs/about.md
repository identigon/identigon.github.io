# About & Architecture

## The pipeline

Identigon is three Java 25 projects forming a pipeline, each with exactly one job:

| Layer | Project                                                                 | Responsibility                                        | Deterministic?                                | Judgment / LLM? |
| :---- | :---------------------------------------------------------------------- | :---------------------------------------------------- | :-------------------------------------------- | :-------------- |
| 1     | [alterego](https://github.com/identigon/identigon/tree/main/alterego)   | Fabricate one field value                             | Yes                                           | No              |
| 2     | [incognito](https://github.com/identigon/identigon/tree/main/incognito) | Clone a schema, orchestrate the load from a policy    | Yes                                           | No              |
| 3     | [effigies](https://github.com/identigon/identigon/tree/main/effigies)   | Discover a schema, author/infer a policy, drive a run | Authoring is advisory; runs are deterministic | Yes — here only |

`effigies` depends on `incognito`, which depends on `alterego` — each layer consumes the one below
it and adds exactly one capability.

## Why three projects, not one

**alterego turns one value into one fictional value.** It's deterministic in
`(salt, domain, value)`, stateless with respect to any dataset, and database-agnostic — the same
library works on a CSV column or an API payload, not just a JDBC result set.

**incognito owns everything relational**: schema discovery, topological load order, key translation
(so a rewritten primary key propagates correctly to every foreign key referencing it), coherent
cross-entity temporal deltas (a customer's `created_at` and their first order's `created_at` still
make sense relative to each other after fabrication), and bulk loading with trigger isolation. It
delegates every actual value substitution to alterego — it never hand-rolls redaction or fabrication
itself.

**effigies is the only place judgment lives.** Deciding what a column _is_ — is `ssn` a direct
identifier, is `dob` a quasi-identifier, is `notes` free text that happens to contain PII — is real,
sometimes ambiguous work. That's authoring, not execution, so it lives above the engine, free to
evolve (regex heuristics today, an AI agent interviewing you tomorrow) without ever touching the
deterministic, reproducible core.

## Fabrication, not k-anonymity

The classic statistical-disclosure models — k-anonymity, l-diversity, t-closeness — achieve privacy
by _generalising_ quasi-identifiers into equivalence classes: ages become ranges, exact dates become
buckets. That requires a global statistical pass over each table, degrades data utility, and still
leaves real values in place, just coarsened — which doesn't fit "run the same application code
against realistic-looking data."

Identigon instead **fabricates**: every direct and quasi-identifier is replaced by a deterministic,
irreversible, obviously-fictional substitute, generated from a salt-keyed HMAC-SHA256 stream.
There's no k-factor to tune and no statistical analysis of the clone — correctness is about severing
linkage and guaranteeing fictionality, not reaching a threshold. One consequence: because
identifiers are genuinely fabricated rather than merely coarsened, operational data (order totals,
timestamps, statuses) can be kept real — which is exactly what makes the clone useful for testing.

## Guaranteed-fictional, not just random

Where a value space has an officially reserved or structurally impossible region, alterego generates
inside it by default: RFC 2606 reserved email domains (`example.com`, `example.net`, …), Ofcom's
drama telephone number ranges, UK postcodes with an inward-code letter that's never actually issued
(`C I K M O V`). Output in these categories doesn't just _look_ fake — it fails a real lookup (MX
record, number allocation, PAF), which is exactly what pseudonymised data appearing in a test
system, a demo, or a screenshot should do. No such formal guarantee is possible for names, streets,
or cities (each output word is real; only the combination is synthetic) — each built-in generator
documents which category it falls into.

## Fail-closed, always

The one mistake that leaks real data is an identifier nobody classified — a column the policy simply
didn't mention, copied through on the assumption it's harmless. So every discovered column must
resolve to an explicit role before a run starts. Auto-inference — whether a regex heuristic or an
agent — only ever _suggests_ a role into the authoring artifact; it never assigns one on its own. An
unclassified column aborts the run, every time, even with inference switched on. A brand-new column
appearing in the source will break a previously-passing policy until someone classifies it —
deliberately: that's the mechanism, not a bug. See
[Getting Started](/getting-started#_3-author-the-policy) for what that looks like in practice.

## No model in the engine path

An AI agent may help you _author_ a policy — interviewing you about ambiguous columns, batching
related questions so you're not answering one at a time, never assigning a role without your
explicit confirmation. It never participates in _running_ one. The produced `policy.yaml` is the
durable, reviewable, checked-in boundary between judgment and execution: once it's written, the
anonymisation run itself is a deterministic, reproducible, model-free `incognito` execution, and the
accountability (DPIA) report it emits is the safety net that catches a wrong classification —
source-value survival checks, a misdeclaration lint, structural-uniqueness findings, and
illustrative sample rows showing exactly what the clone looks like.
