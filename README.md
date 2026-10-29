# LEXICON

Веб-приложение для перевода, словарей и работы с документами.

- Frontend: `index.html`, `app.js`, `style.css`; PWA — `sw.js`, `manifest.webmanifest`, `icon.svg`.
- Backend: `backend/worker.js`, импортированный из существующего Cloudflare Worker `lexicon-worker`.
- Конфигурация: `backend/wrangler.jsonc`, существующая D1-база `lexicon-db` через binding `DB`.
- Инструменты: Wrangler и Playwright в devDependencies; зависимости фиксируются `package-lock.json`.
- PWA: обновление кнопкой **Update**; [описание и проверка на iPhone](docs/PWA_UPDATES.md).
- ChatGPT MCP: пять инструментов словарей в существующем Worker; [подключение OAuth](docs/MCP_CONNECT.md).

Frontend: [GitHub Pages](https://timashevanatoly10-blip.github.io/lexicon/), публикация из корня `main`.
Перед публикацией: `npm run build:frontend`, `npm run check:frontend`, `npm run test:pwa`.
Тесты используют установленный Chrome; канал задаётся `LEXICON_TEST_BROWSER`.

Подробная карта, идентификаторы и статус проверок: [docs/PROJECT.md](docs/PROJECT.md).
Правила Codex: [AGENTS.md](AGENTS.md). Этапы и журнал: [docs/CHECKPOINTS.md](docs/CHECKPOINTS.md).

CP-001: `CP-001: Import LEXICON backend and add PWA update`, тег `cp-001`.
Фактический статус commit/push/публикации — в журнале checkpoints.
Production deploy, операции с D1 и изменение секретов требуют отдельного явного
разрешения. Состояние GitHub не является доказательством состояния Cloudflare.
