# Existing LEXICON Worker

`worker.js` is the deployed module downloaded unchanged from Cloudflare on 2026-10-29.
Account: `e7dd176c5580b561da2048b23ed5f6c0`. Worker: `lexicon-worker`.

`wrangler.jsonc` describes the existing Worker and D1 database. It contains only
non-sensitive configuration. `keep_vars: true` is intended to preserve remote vars
omitted from this configuration; it does not replace checking all bindings and secrets. Review remote settings before
deploying; this import did not deploy or modify Cloudflare resources.

Sensitive bindings `ACCESS_TOKENS`, `DEEPL_API_KEY`, and `OPENAI_API_KEY` are
intentionally absent. Obtain development values separately and put them only in
an ignored `backend/.dev.vars` file. Never commit credentials. No local secrets
file was created by this import.

The D1 binding references the existing `lexicon-db`; database data and migrations
were not downloaded or changed. For local development, Wrangler normally uses
a separate local D1 database. Do not enable remote database access or run
migrations without reviewing the intended environment.

Syntax check from the repository root: `node --check backend/worker.js`.

Follow `../AGENTS.md` and `../docs/PROJECT.md`. Production deployment, any D1
operation (including local queries/migrations), and secret changes require
separate explicit permission. The CP-001 task authorizes commit/tag/push and
frontend publication only; see `../docs/CHECKPOINTS.md` for actual delivery status.
Backend deployment remains separately restricted.

This downloaded module is the deployed JavaScript, not a recovered original
TypeScript project, build pipeline, or Git history.
