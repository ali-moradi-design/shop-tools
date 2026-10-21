# Project instructions

Tools shop (`shop-tools`). Scope and decisions: `docs/brief.md`. Progress: `docs/build-log.md`.

## Language

- Explain in Persian (Farsi). Put every English word or code name inside
  parentheses and backticks. Never start a line or bullet with an English word.
- Repo files are written in English.

## Workflow

- Small PRs: branch → PR → CI → squash merge. Update `docs/build-log.md` in each PR.
- No new UI code before the mockups are approved.

## graphify (use it to save tokens)

The code graph lives in `graphify-out/` (ignored by Git, built locally, costs no LLM tokens).

- Before reading many files, ask the graph first:
  `graphify query "<question>" --budget 1500`, `graphify explain "<node>"`,
  `graphify path "<A>" "<B>"`. Open only the files the answer points to.
- `graphify-out/GRAPH_REPORT.md` has the community map and god nodes; read it
  instead of listing directories.
- After code changes run `graphify update .` (AST only, no LLM, no API key).
- Do not run a full `/graphify` pass on docs or images: it spends tokens on
  semantic extraction. The code graph is enough for this repo.
- If the graph is missing, rebuild it with `graphify update .`.
