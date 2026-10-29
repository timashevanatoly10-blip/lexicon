# Карта проекта LEXICON

Составлено 2026-10-29. Локальные файлы и Git проверены при подготовке CP-001.
Облачные сведения ниже получены через Wrangler whoami и GET Cloudflare API
при проверке и импорте 2026-10-29; это снимок, а не гарантия текущего production.
При подготовке этой документации повторных запросов к Cloudflare не выполнялось.
GitHub Pages проверен отдельно 2026-10-29 через аутентифицированный GitHub REST API.

## Архитектура

| Компонент | Файлы / ресурс | Назначение и статус |
|---|---|---|
| Frontend | `index.html`, `app.js`, `style.css` | Статическое браузерное приложение; перевод, словари, обработка документов и ИИ-интерфейсы |
| PWA | `manifest.webmanifest`, `icons/`, `sw.js`, `pwa-updates.js`, `pwa-state.js`, `pwa-updates.css`, `frontend-release.js` | Регистрация в pwa-updates.js; prompt lifecycle по MyMate, сохранение черновиков, активация по кнопке |
| Backend | `backend/worker.js` | Развёрнутый JS-модуль, импортирован через API без изменения байтов; исходная TS-структура и сборочный проект не восстановлены |
| Cloudflare Worker | `lexicon-worker` | Облачный backend, окружение `production` |
| D1 | `lexicon-db`, binding `DB` | Существующая база; данные, схема и миграции не импортированы и не проверены |
| Wrangler | `backend/wrangler.jsonc` | Имя Worker, аккаунт, compatibility date, D1 и несекретные vars |
| Инструменты | `package.json`, `package-lock.json`, `scripts/`, `tests/` | Wrangler 4.155.0 и Playwright как devDependencies; детерминированная frontend-сборка и A → B тесты; lock фиксирует дерево |
| GitHub | `origin` | Хранение исходников, конфигурации без секретов и истории изменений |

Frontend обращается к `https://lexicon-worker.timashevanatoly10.workers.dev`.
В `app.js` также задан `VETAI_API_BASE`:
`https://gpt24-test.timashevanatoly10.workers.dev`. Это внешняя зависимость вне
текущего разрешённого объёма работ; здесь не исследуется и не изменяется.

## Точные идентификаторы

| Параметр | Значение |
|---|---|
| Cloudflare Account ID | `e7dd176c5580b561da2048b23ed5f6c0` |
| Учётная запись при проверке | `timashevanatoly10@gmail.com` |
| Worker | `lexicon-worker` |
| Окружение | `production` |
| workers.dev | `https://lexicon-worker.timashevanatoly10.workers.dev` |
| compatibility_date | `2026-05-01` |
| compatibility_flags | Пустой список при импорте |
| D1 database_name | `lexicon-db` |
| D1 binding | `DB` |
| D1 database_id | `6e63edd9-166b-400a-a644-caf474dc0ce6` |
| GitHub origin (fetch/push) | `https://github.com/timashevanatoly10-blip/lexicon.git` |
| Ветка при подготовке | `main` |
| HEAD до CP-001 | `40f8c9f` — `Enhance folder object with description and modal` |

При облачной проверке: workers.dev включён, preview URLs выключены, cron пуст,
привязок R2/KV нет. Список Custom Domains и список зон аккаунта пусты; маршруты
зон не обнаружены. Логи включены, traces выключены. Импорт не менял эти настройки.

SHA-256 импортированного `backend/worker.js`:
`4875fa0e2d8d3fcb2abb20d84767c5bce5a25ec18b26028fe44d814ddbd4397a`.
Это идентификатор импортированного файла, не подтверждение активной версии
Cloudflare после даты проверки. Deployment/version ID не зафиксирован — непроверено.

## Переменные и секреты

В конфигурацию перенесены несекретные vars:
`OPENAI_MODEL`, `OPENAI_TRANSCRIBE_MODEL`, `PROMPT_IMAGE_TEXT_EXTRACT`,
`PROMPT_TEXT_LEFT`, `PROMPT_TEXT_TRANSLATE`, `PROMPT_WORD_CARD_SHORT`,
`PROMPT_WORD_LEFT`, `PROMPT_WORD_QUICK_TRANSLATE`, `PROMPT_WORD_RIGHT`,
`PROMPT_WORD_TRANSLATE`.

Чувствительные bindings отсутствуют в Git-конфигурации: `ACCESS_TOKENS`,
`DEEPL_API_KEY`, `OPENAI_API_KEY`. Их значения не документируются.
При облачной проверке ACCESS_TOKENS имел тип plain_text, ключи API — secret_text.
Изменение типа, ротация или перенос этих значений требуют отдельного разрешения.

`keep_vars: true` установлен для сохранения remote vars, отсутствующих локально.
Это не гарантия сохранения всех bindings и секретов: перед каждым deploy нужна
отдельная сверка актуальных настроек с подготовленной конфигурацией.
`.gitignore` исключает node_modules, .wrangler, локальные env/dev.vars и ключи;
разрешённые example-файлы должны содержать только заглушки.

## Публикация и источники истины

- GitHub: после разрешения сохранять исходники Worker, несекретную конфигурацию,
  lock-файл и описание каждого изменения. Для CP-001 пользователь разрешил commit,
  tag, push и frontend-публикацию. Фактический статус — в CHECKPOINTS.md.
  Push сам по себе не означает публикацию в Cloudflare.
- Backend: дальнейшая публикация через локальный Wrangler с явным указанием
  `backend/wrangler.jsonc`, только после отдельного разрешения на production deploy.
  Подготовка должна фиксировать точный commit/tag, файлы и хеши; после публикации
  фиксировать проверенную активную версию и результат smoke test в журнале.
- Frontend: `https://timashevanatoly10-blip.github.io/lexicon/`, GitHub Pages.
  Проверен build_type `legacy`, source `main`, path `/`, HTTPS включён, custom
  domain нет. Workflow `pages-build-deployment`, ID `269609938`; push в main
  запускает публикацию. `_config.yml` исключает backend и служебные файлы из сайта.
  Другие внешние интеграции репозитория не проверены. Backend deploy в CP-001 нет.
- Сборка: `npm run build:frontend` обновляет `sw.js` и `frontend-release.js`
  по содержимому публичных assets и шаблона. Backend/docs не меняют frontend ID.
  Файлы подготавливаются до commit, серверного Vite/React build нет.
  `npm run check:frontend` проверяет актуальность. Подробнее — [PWA_UPDATES.md](PWA_UPDATES.md).
- Dashboard/API показывают облачное состояние; локальные файлы и GitHub показывают
  сохранённые версии. Сверка необходима перед каждым production deploy.
- D1: никаких SQL-запросов, экспорта, миграций или подключения к remote D1 без
  отдельного явного разрешения. Локальная D1 не является копией production.

## MCP LEXICON — CP-002

Реализован `/mcp` в том же lexicon-worker: stateless Streamable HTTP JSON,
list_dictionaries, get_dictionary, create_dictionary, add_words, search_words.
Словари и карточки остаются в существующих таблицах. `backend/services/dictionaries.js`
переиспользуется MCP и прежними REST list/create/add; остальные API сохранены.
OAuth в `backend/mcp/oauth.js`: DCR для ChatGPT, code + PKCE S256, opaque tokens
с хешами в D1, scopes/resource, refresh rotation/revocation. Browser consent
подтверждает существующий ACCESS token и связывает grant с прежним owner hash.
OpenAI/DeepL не вызываются MCP, существующие ключи не служат OAuth credentials.

- [Подключение, ограничения, API tools и безопасные операции](MCP_CONNECT.md).
- [Исторический технический план](MCP_INTEGRATION_PLAN.md).
- [Подтверждённый снимок структуры D1](MCP_SCHEMA_SNAPSHOT.md) — прочитаны только
  sqlite_schema/метаданные разрешённой базы 2026-10-29; данные пользователей не читались.
- [Исходный план тестов и команды ChatGPT](MCP_TEST_PLAN.md).

Runtime не имеет внешних SDK-зависимостей; официальный MCP SDK — devDependency
для локального и production smoke. Migration `backend/migrations/0001_mcp.sql`
добавляет normalized_word/search_text и служебные таблицы mcp_operations,
mcp_oauth_clients/codes/grants, mcp_used_refresh, mcp_rate_limits. Новых Workers,
баз и хостинга нет. Схема исходных таблиц/карточек остаётся совместимой.
Резервный SQL хранится только в игнорируемой `.wrangler/cp002/private/`;
восстановление и сохранность исходных полей проверены до production migration.
Точная версия, хеш backend/deploy artifact и подтверждённое состояние production
фиксируются в [CHECKPOINTS.md](CHECKPOINTS.md). GitHub не доказывает состояние Worker.

Проверено 2026-10-29 19:58 МСК: CP-002
`ffce58bc0d33f53d8442f00570eeda36150071d0`, неизменяемый `cp-002`;
публиковался чистый manifest commit `76e52e0bd1f7ee37c888196ca9843081b8a789ee`
с тем же runtime. Deployment `c2e16325-ebe1-4304-8953-5d427c89792d`, version
`7930c8e7-be50-43ec-adb0-3d06829a1ce0` (100%). Bundled backend SHA-256:
`05de91f352f29ee72592fbddf1225296f4bdce76aa0676b48b4292175b7ed6a6`.
Production migration/backfill завершены после backup. OAuth + стандартный MCP
SDK и старый API прошли read-only smoke; binding names/types, DB и plain vars
сохранены. Значения secret_text не извлекались и не менялись. Тестовых словарей
или слов в production не создавалось. Подключение UI ChatGPT — отдельный шаг.

## Ведение изменений (правила)

Постоянные правила — [AGENTS.md](../AGENTS.md).
Порядок checkpoint и журнал — [CHECKPOINTS.md](CHECKPOINTS.md).
Rollback через согласованный revert; отдельный production rollback/deploy требует
своего разрешения и не происходит автоматически при откате Git.
