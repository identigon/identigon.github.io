# Getting Started

This walks through installing and running the Identigon CLI, which discovers a source database's
schema, helps you author a declarative anonymisation policy, and runs it to produce a
schema-identical, PII-free clone. If you want to work directly with the lower-level libraries
instead of the CLI, more docs are coming; for now, see the READMEs in the
[monorepo](https://github.com/identigon/identigon).

The schema used below (`customer`/`orders`, lower case — Postgres folds unquoted identifiers to
lower case, so that's what you'll see even if you write `CREATE TABLE CUSTOMER`) is illustrative, to
keep each step's output short. For a small, real, copy-pasteable schema you can run through every
step yourself right now — DDL, seed data, and a finished `policy.yaml` included — see
[`quickstart/`](https://github.com/identigon/identigon/tree/main/quickstart)
in the monorepo.

## Prerequisites

- Java 25
- A source database to anonymise, and a schema-identical target database to clone into —
  **PostgreSQL is what's actually tested and tuned today** (batch optimisation, sequence reset,
  FK/trigger isolation). Other JDBC-accessible databases can be reached through a generic-ANSI
  fallback path, but it's untested — treat it as "might work," not "supported." For PostgreSQL,
  produce the target with `pg_dump --schema-only --no-owner --no-privileges`, then load that into an
  empty database — leaving out `--schema-only` is silently catastrophic, since `run` loads *into*
  the target rather than replacing it:
  ```sh
  pg_dump --schema-only --no-owner --no-privileges -d source_db > schema.sql
  psql -d target_db -f schema.sql
  ```
- A clone of [identigon/identigon](https://github.com/identigon/identigon), built with
  `./gradlew build` — this produces a single runnable jar, `identigon.jar` (under
  `effigies/build/libs/`)

## 1. Discover the schema

**Why:** before anything is generated, it's worth seeing exactly what the CLI will be working with —
every table and column it can see, and how they relate. It's a quick sanity check, and it touches
metadata only; no row values are ever read at this step.

```sh
export IDENTIGON_SOURCE_PASSWORD="secret"
java -jar build/libs/identigon.jar discover \
  --source-url "jdbc:postgresql://..." --source-user "admin"
```

**Produces:** a human-readable summary printed to stdout — nothing is written to a file. Each table,
with every column annotated by type and, where relevant, `pk` / `fk -> <table>`:

```text
Table: customer
  id (type: BIGINT, pk)
  first_name (type: VARCHAR)
  email (type: VARCHAR)
  postcode (type: VARCHAR)

Table: orders
  id (type: BIGINT, pk)
  customer_id (type: BIGINT, fk -> customer)
  total (type: NUMERIC)
  created_at (type: TIMESTAMP)
```

## 2. Scaffold a policy

**Why:** turns that same metadata into an actual starter config, instead of you hand-writing YAML
against the whole schema from scratch. It also runs deterministic name-heuristics (e.g. a column
ending in `email` suggests `DIRECT_ID`) and leaves the suggestion as a comment — never applied — so
you have a head start without anything being silently classified on your behalf.

```sh
java -jar build/libs/identigon.jar scaffold \
  --source-url "jdbc:postgresql://..." --source-user "admin" \
  --out ./policy.draft.yaml
```

**Produces:** a `policy.draft.yaml` file, one entry per table/column, every `role:` left blank — a
suggestion in the comment where a heuristic matched, a pointer to the role vocabulary where none
did:

```yaml
autoInfer: false
tables:
  customer:
    columns:
      id: # type: BIGINT, pk
        role: # TODO classify — see the role vocabulary; run fails closed until filled
      first_name: # type: VARCHAR
        role: # TODO classify (Suggestion: DIRECT_ID based on NAME_PATTERN)
      email: # type: VARCHAR
        role: # TODO classify (Suggestion: DIRECT_ID based on EMAIL_PATTERN)
      postcode: # type: VARCHAR
        role: # TODO classify (Suggestion: QUASI_ID based on POSTCODE_PATTERN)
  orders:
    columns:
      id: # type: BIGINT, pk
        role: # TODO classify — see the role vocabulary; run fails closed until filled
      customer_id: # type: BIGINT, fk -> customer
        role: # TODO classify — see the role vocabulary; run fails closed until filled
      total: # type: NUMERIC
        role: # TODO classify — see the role vocabulary; run fails closed until filled
      created_at: # type: TIMESTAMP
        role: # TODO classify — see the role vocabulary; run fails closed until filled
```

Note that `id` and `customer_id` get no suggestion, even though they're structurally a primary key
and a foreign key — the heuristics only look at column _names_, not constraints. You still have to
classify those explicitly (`PRIMARY_KEY` / `FOREIGN_KEY`); nothing here is assumed for you.

## 3. Author the policy

**Why:** this is the step where the actual privacy judgment happens — deciding what each column
_is_. It's deliberately a human decision (optionally assisted): the run refuses to start until every
column has an explicit role, so nothing new in the source can slip through unclassified — see
[Fail-closed, always](/about#fail-closed-always) for why that's a hard rule, not a default.

Identigon ships an Agent Skill (`.agents/skills/identigon-policy-author/SKILL.md`) that AI
assistants — Claude, Antigravity, Copilot, and similar — can use to interview you and fill in the
scaffold. It batches related columns (e.g. every audit timestamp at once) so you're not answering
one question per column, and asks for your explicit confirmation before assigning anything —
Identigon never assigns a role behind your back. You can also hand-edit the YAML directly; it's a
plain declarative file.

**Produces:** the same file, every `role:` now filled in and renamed to `policy.yaml` — a runnable
config with nothing left blank:

```yaml
autoInfer: false
tables:
  customer:
    columns:
      id:
        role: PRIMARY_KEY
      first_name:
        role: DIRECT_ID
      email:
        role: DIRECT_ID
      postcode:
        role: QUASI_ID
  orders:
    columns:
      id:
        role: PRIMARY_KEY
      customer_id:
        role: FOREIGN_KEY
      total:
        role: PAYLOAD
      created_at:
        role: PAYLOAD
```

## 4. Run

**Why:** this is the actual anonymisation — a deterministic, model-free execution against the
now-finished policy. Nothing judgment-shaped happens here; if the policy is valid, the run is fully
reproducible from it.

```sh
export IDENTIGON_SOURCE_PASSWORD="secret"
export IDENTIGON_TARGET_PASSWORD="secret"

# Only required when policy.yaml sets saltMode: persistent or reproducible
export IDENTIGON_SALT="my-secret-salt-bytes"

java -jar build/libs/identigon.jar run \
  --policy ./policy.yaml \
  --source-url "jdbc:postgresql://..." --source-user "admin" \
  --target-url "jdbc:postgresql://..." --target-user "admin"
```

Credentials and salt bytes come from the environment, never from the policy file itself.

**Produces:** the anonymised clone, loaded into the target database — plus a short summary and three
DPIA report files written to the working directory:

```text
Starting anonymisation pipeline (Salt Mode: ephemeral)...
Pipeline completed successfully.
Tables transformed: 2
Rows processed: 1245
DPIA artefact written to ./dpia-report.html, ./dpia-report.json and ./dpia-report.md
```

## 5. Review the DPIA report

**Why:** a run completing without error isn't proof the classification was right — this is the
safety net that lets you (or a reviewer) actually check. It records referential integrity, the
transformation applied per column, any misdeclaration-lint or structural-uniqueness findings, and a
handful of illustrative synthetic sample rows, so nobody has to trust the run blind.

**Produces:** the same report in three formats, generated from the run above —

- `dpia-report.html` — presentation-ready
- `dpia-report.json` — machine-readable
- `dpia-report.md` — human-diffable, good for a pull request

## Salt modes

`policy.yaml` declares how the run's secret salt is handled:

| Mode                  | Behaviour                                                                                                                                                   |
| :-------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ephemeral` (default) | A fresh random salt per run, destroyed on completion. Irreversible and unlinkable — nobody, including you, can map a fabricated value back to the original. |
| `persistent`          | A fixed, caller-supplied salt (`IDENTIGON_SALT`). Repeatable across runs, but linkable — forfeits irreversibility.                                          |
| `reproducible`        | A fixed salt and RNG seed (`IDENTIGON_SEED`). Byte-for-byte identical output on every run — for test fixtures.                                              |

`IDENTIGON_SALT` must be at least 16 bytes for `persistent` and `reproducible` modes (the
`"my-secret-salt-bytes"` example above is 20 bytes, comfortably over). The salt is never logged, and
never appears in the policy file itself.
