# Карта проекта LEXICON

Connection Reliability CP-005: [диагностика, исправления, тесты и проверка на
iPhone](CONNECTION_DIAGNOSTICS.md). Публикация явно разрешена 2026-10-31;
фактический статус — в CHECKPOINTS.md. Новый api-connection.js обслуживает
ограниченные GET-повторы и восстановление; backend и production D1 не меняются.

Актуальное расширение CP-004: [папки словарей](CP004_FOLDERS.md).
Структура хранится отдельно от dictionaries/карточек, новые REST операции
в `backend/services/dictionary-tree.js`, UI — три файла dictionary-tree*.
Миграция 0003 additive, существующие словари имеют неявный корень.
Оба существующих сайта: https://timashevanatoly10-blip.github.io/lexicon/
и https://mylexicon.pages.dev/ (Cloudflare Pages project mylexicon, Git main).
Их принадлежность LEXICON проверена через API 2026-10-30. Точный статус
публикации CP-004 и версии записываются в CHECKPOINTS.md после проверки.
Ниже сохранён исторический снимок CP-001 и последующие записи этапов.

## Актуальная версия CP-004 — 2026-10-30 12:31 МСК

- Папки: `dictionary-tree-model.js`, `dictionary-tree.js`, `dictionary-tree.css`;
  REST `/api/dictionary-tree` → `backend/services/dictionary-tree.js`.
- D1: additive 0003 добавляет folders/locations/operations/confirmations;
  прежние dictionaries, words/meta.fullCard, public links и Inbox совпали
  с pre-migration backup по всем полям. Словари имеют прежние ID и неявный корень.
- Функциональный commit/tag cp-004 `df6d1702360fae0f95cd50e654bb13b2cf409104`;
  PWA Pages correction `8b19e8ab79d74c3e7186f4afc1d13d9bcf2f011b`, оба pushed.
- Worker deployment `8f169044-f2dc-47c0-9d46-b2dc42b62d13`, version
  `4db850ab-fa70-46b3-b5ee-276b546fb28f`, 100%; bundle SHA-256
  `8371f8992694015c8b91a10c89921a6e7133c6482064986b1a6c6437429bc18d`.
  Все прежние bindings/vars/secrets сохранены. REST/MCP/OAuth/tree smoke PASS.
- Оба frontend built/success на `8b19e8a`, release `3f71534d9b2b6f591e9d`;
  CF Pages deployment `c25adb20-bdb1-4a1c-ac5e-b4bddfc812b3`. Все 16 файлов
  каждого сайта совпали по SHA-256. Production Chrome A→B/Update/draft PASS;
  CF Pages SW install/offline PASS. Physical iPhone/iOS PWA не проверен.

Полный audit и последующая документационная фиксация — CHECKPOINTS.md.

## Исторический снимок импорта CP-001

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

## MCP LEXICON — CP-003

CP-003 расширяет тот же Worker девятью tools: полные карточки через существующие
три режима AI, durable задачи и подтверждаемое удаление. Контракты/расходы/
ограничения — [CP003_MCP.md](CP003_MCP.md); фактический статус публикации ниже
в журнале CHECKPOINTS. Исходные dictionaries/dictionary_words и owner hashes
используются без замены. Число owners не ограничено двумя.
Общий AI-модуль `backend/services/ai.js` используется прежним `/api/ai` и MCP;
общие deletion operations — прежним REST и подтверждаемыми MCP tools.
`0002_full_cards.sql` добавляет только mcp_word_tasks, mcp_word_panels,
mcp_generation_budget, mcp_delete_confirmations и concurrency index.
Frontend-файлы обоих сайтов прежние. Production-версия CP-003 фиксируется
после deploy, до этого сведения CP-002 ниже являются предыдущим состоянием.

Проверено 2026-10-30 01:33 МСК: CP-003
`34becb2331f95818546a76a9445d3d85ba2ebb8f`, cp-003; deploy из manifest
`e56edcdbc6cce1ff91bb5afd87f0978b71546b93` с тем же runtime.
Deployment `277f03e5-3404-4223-9490-34466c694dc8`, version
`61231223-3a34-4154-938b-95eaa8d235bd` (100%). Bundled SHA-256:
`a2bf736b246abd316f00b2deaff3ed5d884c4c75477ed5e7713dcecafb20ee6e`.
Additive migration выполнена после backup/restore verification. Live MCP SDK,
прежний REST и browser OAuth прошли read-only smoke. Пользовательские словари,
owners и секреты не менялись; «кодекс» не удаляли. Реальная AI-генерация трёх
панелей проверена без записи в словарь, затем эти ответы прошли локальный task
pipeline и frontend renderers. Live запись/удаление пользовательских карточек
не выполнялись. Новые delete scopes требуют повторного OAuth.

### Предыдущая версия CP-002

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

Обновление CP-002 от 2026-10-30 00:12 МСК: исправлен browser OAuth
`invalid_origin` (no-referrer → Origin null) и CSP redirect. Commit
`d89fcf2c6c066cde2c77db24f00f1ffb70b3cf80`, deployment
`4bb5c9dc-d775-4fc1-9bd8-b878d44e69aa`, version
`c44288f6-3673-4e75-8f9d-c4383f78bd08` (100%). Актуальный bundled SHA-256:
`a987f137bfc58209d640784f94413c5438f683553bcb3827c4660e7cb18ac999`.
Фактическая production-форма в Chrome прошла POST/303/callback/PKCE; live MCP и
старый API также прошли smoke. Строгие Origin/CSRF проверки сохранены, D1/секреты
не менялись, cp-002 не передвигался. Подробности и границы — в журнале.

## Ведение изменений (правила)

Постоянные правила — [AGENTS.md](../AGENTS.md).
Порядок checkpoint и журнал — [CHECKPOINTS.md](CHECKPOINTS.md).
Rollback через согласованный revert; отдельный production rollback/deploy требует
своего разрешения и не происходит автоматически при откате Git.
