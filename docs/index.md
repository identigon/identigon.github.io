---
layout: home

hero:
  name: "Identigon"
  text: "Anonymise a database, credibly."
  tagline:
    Deterministic pseudonymisation and privacy-preserving database cloning — for test, staging, and
    demo environments that need real-looking data without real PII.
  actions:
    - theme: brand
      text: View on GitHub
      link: https://github.com/identigon/identigon
    - theme: alt
      text: Getting Started
      link: /getting-started

features:
  - title: Fail-closed by default
    details:
      Every column must resolve to an explicit role before a run starts. Nothing is ever silently
      copied through unclassified, inference only ever suggests.
  - title: Deterministic & reproducible
    details:
      The same source value and salt always fabricate to the same fictional value — no randomness,
      no drift between runs, byte-for-byte repeatable when you need it to be.
  - title: Guaranteed-fictional output
    details:
      Fabricated values land in officially reserved or structurally-impossible ranges wherever one
      exists, so the result doesn't just look fake — it fails a real lookup.
  - title: Built-in accountability
    details:
      Every run emits a DPIA report (HTML, JSON, and Markdown) recording what changed and why, so a
      classification never has to be trusted blind.
---
