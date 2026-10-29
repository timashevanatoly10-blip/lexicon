# Existing LEXICON Worker

`worker.js` started as the module imported from Cloudflare on 2026-10-29 (CP-001).
CP-002 adds OAuth-protected `/mcp` and shared dictionary operations. See
[MCP connection and operations](../docs/MCP_CONNECT.md) and the verified
[deployment journal](../docs/CHECKPOINTS.md); do not infer production state from Git.

CP-003 shares the original AI pipeline between REST and durable full-card MCP
tasks, adds confirmation-protected deletion and an additive control-table
migration. See [CP-003 contracts, costs and limitations](../docs/CP003_MCP.md).
Account: `e7dd176c5580b561da2048b23ed5f6c0`. Worker: `lexicon-worker`.

`wrangler.jsonc` describes the existing Worker and D1 database. It contains only
non-sensitive configuration. `keep_vars: true` is intended to preserve remote vars
omitted from this configuration; it does not replace checking all bindings and secrets. Review remote settings before
deploying; this import did not deploy or modify Cloudflare resources.

Sensitive bindings `ACCESS_TOKENS`, `DEEPL_API_KEY`, and `OPENAI_API_KEY` are
intentionally absent. Obtain development values separately and put them only in
an ignored `backend/.dev.vars` file. Never commit credentials. No local secrets
file was created by this import.

The D1 binding references the existing `lexicon-db`. CP-002 includes an additive
migration and a verified private backup workflow; see the deployment journal for
actual production application. For local development, Wrangler normally uses
a separate local D1 database. Do not enable remote database access or run
migrations without reviewing the intended environment.

Syntax check from the repository root: `node --check backend/worker.js`.

Follow `../AGENTS.md` and `../docs/PROJECT.md`. Production deployment, any D1
operation (including local queries/migrations), and secret changes require
separate explicit permission. The current CP-002 task explicitly authorizes its
backup, additive migration, commit/tag/push and existing Worker deploy; this does
not authorize later deployments or secret changes.

This downloaded module is the deployed JavaScript, not a recovered original
TypeScript project, build pipeline, or Git history.
