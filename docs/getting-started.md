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
[`quickstart/`](https://github.com/identigon/identigon/tree/main/quickstart) in the monorepo.

## Prerequisites

- Java 25
- A source database to anonymise, and a schema-identical target database to clone into —
  **PostgreSQL is what's actually tested and tuned today** (batch optimisation, sequence reset,
  FK/trigger isolation). Other JDBC-accessible databases can be reached through a generic-ANSI
  fallback path, but it's untested — treat it as "might work," not "supported." For PostgreSQL,
  produce the target with `pg_dump --schema-only --no-owner --no-privileges`, then load that into an
  empty database — leaving out `--schema-only` is silently catastrophic, since `run` loads _into_
  the target rather than replacing it:

  ```sh
  pg_dump --schema-only --no-owner --no-privileges -d source_db > schema.sql
  psql -d target_db -f schema.sql
  ```

- `identigon.jar`, the runnable CLI. Either build it yourself — clone
  [identigon/identigon](https://github.com/identigon/identigon) and run `./gradlew build` (produces
  it under `effigies/build/libs/`) — or skip the build and download the prebuilt jar directly from
  the
  [latest release](https://github.com/identigon/identigon/releases/latest/download/identigon.jar).
  The commands below assume `effigies/build/libs/identigon.jar`; adjust the path if you downloaded
  it instead.

Two more commands sit alongside the four walked through below: `identigon.jar version` prints the
running build's version (worth including in a bug report), and `identigon.jar help` (also the
default with no arguments) lists every command with a one-line description.

## 1. Discover the schema

**Why:** before anything is generated, it's worth seeing exactly what the CLI will be working with —
every table and column it can see, and how they relate. It's a quick sanity check, and it touches
metadata only; no row values are ever read at this step.

```sh
export IDENTIGON_SOURCE_PASSWORD="secret"
java -jar effigies/build/libs/identigon.jar discover \
  --source-url "jdbc:postgresql://..." --source-user "admin"
```

**Produces:** a human-readable summary printed to stdout — nothing is written to a file. Each table,
with every column annotated by type and, where relevant, `pk` / `fk -> <table>`:

```text
(Types shown are JDBC's own names, not necessarily the database's - e.g. PostgreSQL's BOOLEAN
reports here as BIT, and TEXT as VARCHAR.)

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
java -jar effigies/build/libs/identigon.jar scaffold \
  --source-url "jdbc:postgresql://..." --source-user "admin" \
  --out ./policy.draft.yaml
```

**Produces:** a `policy.draft.yaml` file, one entry per table/column, every `role:` left blank — a
suggestion in the comment where a heuristic matched, a pointer to the
[role vocabulary](https://github.com/identigon/identigon/blob/main/docs/spec/incognito.md#41-column-roles---transformation)
(the nine usable `ColumnRole` values, plus five reserved ones that parse but fail fast) where none
did:

```yaml
# The `type:` shown against each column below is JDBC's own name, not necessarily the
# database's - e.g. PostgreSQL's BOOLEAN reports here as JDBC's BIT, and TEXT as VARCHAR.
# Still a reliable input for choosing a strategy, just not identical to what the DDL says.
tables:
  customer:
    columns:
      id: # type: BIGINT, pk
        role: # TODO classify (Suggestion: PRIMARY_KEY, structurally discovered - not a guess)
        surrogateStrategy: # TODO if PRIMARY_KEY (Suggestion: SEQUENTIAL_LONG)
      first_name: # type: VARCHAR
        role: # TODO classify (Suggestion: DIRECT_ID based on NAME_PATTERN)
        directIdStrategy: # TODO if DIRECT_ID (Suggestion: ALTEREGO_NAME)
      email: # type: VARCHAR
        role: # TODO classify (Suggestion: DIRECT_ID based on EMAIL_PATTERN)
        directIdStrategy: # TODO if DIRECT_ID (Suggestion: ALTEREGO_EMAIL)
      postcode: # type: VARCHAR
        role: # TODO classify (Suggestion: QUASI_ID based on POSTCODE_PATTERN)
        directIdStrategy: # TODO if QUASI_ID (Suggestion: ALTEREGO_POSTCODE)
  orders:
    columns:
      id: # type: BIGINT, pk
        role: # TODO classify (Suggestion: PRIMARY_KEY, structurally discovered - not a guess)
        surrogateStrategy: # TODO if PRIMARY_KEY (Suggestion: SEQUENTIAL_LONG)
      customer_id: # type: BIGINT, fk -> customer
        role: # TODO classify (Suggestion: FOREIGN_KEY -> customer, structurally discovered - not a guess)
        references: # TODO if FOREIGN_KEY (Suggestion: {table: customer, column: id})
      total: # type: NUMERIC
        role: # TODO classify - see docs/spec/incognito.md §4.1 for the full ColumnRole vocabulary; run fails closed until filled
      created_at: # type: TIMESTAMP
        role: # TODO classify - see docs/spec/incognito.md §4.1 for the full ColumnRole vocabulary; run fails closed until filled
```

`id` and `customer_id` actually get the _most_ confident kind of suggestion here, not none: a real
primary-key/foreign-key constraint is a structural fact, checked before any name-based heuristic
runs, so it's labelled "structurally discovered - not a guess" rather than a `_PATTERN`-based guess
like `first_name`/`email`/`postcode` above. Either way, nothing is assigned for you — every `role:`
is still left blank, yours to fill in explicitly.

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
tables:
  customer:
    columns:
      id:
        role: PRIMARY_KEY
      first_name:
        role: DIRECT_ID
        directIdStrategy: ALTEREGO_NAME
      email:
        role: DIRECT_ID
        directIdStrategy: ALTEREGO_EMAIL
      postcode:
        role: QUASI_ID
        directIdStrategy: ALTEREGO_POSTCODE
  orders:
    columns:
      id:
        role: PRIMARY_KEY
      customer_id:
        role: FOREIGN_KEY
        references: { table: customer, column: id }
      total:
        role: PAYLOAD
      created_at:
        role: PAYLOAD
```

A `DIRECT_ID` column must name a `directIdStrategy` too, not just the role — a bare
`role: DIRECT_ID` fails closed exactly like an unclassified column does (`ALTEREGO_GENERIC` is a
valid choice, but not a silent one). The same rule applies to `postcode` above even though its role
is `QUASI_ID`: `SYNTHESISE` on a character-type column is shape-preserving fabrication with no
fictionality guarantee unless it's paired with a `directIdStrategy` hint — `ALTEREGO_GENERIC` is
still a valid, explicit choice, just not a silent default. Try deleting one of the three
`directIdStrategy:` lines above and running [`validate`](#_4-validate-the-policy) against it, to see
that diagnostic for yourself before moving on. A `FOREIGN_KEY` column needs its `references` block
too, naming the parent table and column, so the loader can translate the surrogate key on the other
side once that table has been cloned.

## 4. Validate the policy

**Why:** a cheap pre-flight check before committing to a full `run` — it re-checks the policy
against the _current_ source schema (no target connection, no data movement) using the same
fail-closed diagnostics `run` would raise for that same check, so a schema migration that leaves the
policy stale is caught immediately rather than mid-run. That's everything `run` checks about the
policy against the source schema; target state (e.g. whether the target already has rows) is only
ever checked at `run` time, since `validate` never connects to one — a green `validate` is not a
guarantee `run` will succeed. It's still a better CI-gate story than a clone-and-build `run`: wire
this into a pipeline to fail a PR the moment `policy.yaml` drifts from the source schema, without
needing a target database at all.

```sh
export IDENTIGON_SOURCE_PASSWORD="secret"
java -jar effigies/build/libs/identigon.jar validate \
  --policy ./policy.yaml \
  --source-url "jdbc:postgresql://..." --source-user "admin"
```

`--policy` defaults to `./policy.yaml` if omitted; `--source-url` and `--source-user` are required.

**Produces:** nothing is written to a file — a one-line confirmation on success:

```text
Policy is valid against 2 discovered table(s).
```

An invalid policy (e.g. a column the schema now has that the policy doesn't classify) exits non-zero
with the same fail-closed diagnostic `run` would raise, printed to stderr instead.

## 5. Run

**Why:** this is the actual anonymisation — a deterministic, model-free execution against the
now-finished policy. Nothing judgment-shaped happens here; if the policy is valid, the run is fully
reproducible from it.

```sh
export IDENTIGON_SOURCE_PASSWORD="secret"
export IDENTIGON_TARGET_PASSWORD="secret"

# Only required when policy.yaml sets saltMode: persistent or reproducible
export IDENTIGON_SALT="my-secret-salt-bytes"

java -jar effigies/build/libs/identigon.jar run \
  --policy ./policy.yaml \
  --source-url "jdbc:postgresql://..." --source-user "admin" \
  --target-url "jdbc:postgresql://..." --target-user "admin"
```

Credentials and salt bytes come from the environment, never from the policy file itself.

`run` refuses to start if any table it would load into already has rows — pointing it at the wrong
database (a mistyped `--target-url`, most plausibly) is otherwise silently destructive: a failed run
rolls back by deleting every row it touched, which would take pre-existing data with it. `--force`
skips this check — it does not empty the target for you. If the existing rows collide (the common
case), the run still fails and compensation deletes them anyway; `--force` is for a target you know
won't collide (partially populated, or tables outside the policy), having accepted that a failure
will still clear it. To re-run cleanly against the same target, truncate it first:

```text
Error executing pipeline: org.identigon.incognito.api.IncognitoException$ConfigException:
Fail-closed: 2 target table(s) already have data - run only loads into an empty target, and a
failed run deletes existing rows during compensation:
  - 'customer' has 1 row(s)
  - 'orders' has 1 row(s)
Point at an empty target, or pass --force if you accept that risk.
```

**Produces:** the anonymised clone, loaded into the target database — plus a short summary and three
DPIA report files written to the working directory:

```text
Starting anonymisation pipeline (Salt Mode: ephemeral)...
Pipeline completed successfully.
Tables transformed: 2
Rows processed: 1245
DPIA artefact written to ./dpia-report.html, ./dpia-report.json and ./dpia-report.md
```

## 6. Review the DPIA report

**Why:** a run completing without error isn't proof the classification was right — this is the
safety net that lets you (or a reviewer) actually check. It records referential integrity, the
transformation applied per column, any misdeclaration-lint or structural-uniqueness findings, and a
handful of illustrative synthetic sample rows, so nobody has to trust the run blind. Each column
also gets its own `Fictionality Verified` field — `yes` when a typed guarantee was actually checked
against the target (e.g. `postcode` above), `—` when the column's strategy carries no such check to
run — a finer-grained companion to the table-level flag, which only says no verification _failed_,
not that every column was checked.

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
| `reproducible`        | A fixed salt (`IDENTIGON_SALT`) and RNG seed (`IDENTIGON_SEED`). Byte-for-byte identical output on every run — for test fixtures.                           |

`IDENTIGON_SALT` must be at least 16 bytes for `persistent` and `reproducible` modes (the
`"my-secret-salt-bytes"` example above is 20 bytes, comfortably over). `IDENTIGON_SEED` is optional
for `reproducible` mode and defaults to `0` if unset. The salt is never logged, and never appears in
the policy file itself.
