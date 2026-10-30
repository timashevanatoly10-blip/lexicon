# Checkpoints LEXICON

Каждый согласованный завершённый этап получает коммит `CP-NNN: описание` и тег
`cp-nnn` на тот же коммит. Проверять историю, локальные и origin-теги перед
нумерацией и непосредственно перед созданием. Не переписывать историю и не
передвигать теги. Rollback преимущественно согласованным revert, без force push.
Откат Git не является откатом production.

Записывать задачу, файлы, проверки, ограничения, commit/tag, состояние GitHub
и фактической публикации отдельно. Результаты deploy сохранять последующим
документационным коммитом без перемещения checkpoint-тега и начала нового этапа.

## CP-001 — Import LEXICON backend and add PWA update

Дата: 2026-10-29.
Сообщение: `CP-001: Import LEXICON backend and add PWA update`.
Тег: `cp-001`, на тот же checkpoint-коммит.

Пользователь разрешил commit, tag, push и публикацию frontend после проверок.
Backend deploy, D1, изменение облачных bindings, vars и secrets не разрешены
и не выполняются. CP-002 не начинается.

### Состав

- Импорт: `backend/worker.js`, `backend/wrangler.jsonc`, `backend/README.md`.
- Ведение: `AGENTS.md`, `README.md`, `docs/PROJECT.md`, этот журнал, `docs/PWA_UPDATES.md`.
- Инструменты: `package.json`, `package-lock.json`, `.gitignore`, `.gitattributes`.
- Frontend: `index.html`, удаление старой регистрации SW из `app.js`, `pwa-updates.js`,
  `pwa-state.js`, `pwa-updates.css`, manifest и PNG-иконки.
- Сборка: `scripts/build-frontend.cjs`, `scripts/sw-template.js`, генерируемые
  `sw.js`, `frontend-release.js`; публикация существующим Pages с `_config.yml`.
- Тест: `tests/pwa-update.cjs`; скриншоты и тестовые профили в Git не входят.

### Проверки перед commit

- История не shallow; на момент подготовки local/origin-тегов и CP-коммитов нет.
- JS-синтаксис frontend и backend; актуальность generated-файлов.
- Хеш импортированного Worker неизменен:
  `4875fa0e2d8d3fcb2abb20d84767c5bce5a25ec18b26028fe44d814ddbd4397a`.
- Идентификаторы аккаунта, Worker и D1 проверены; чувствительные vars исключены.
- Исключения .gitignore, сканирование секретов, whitespace и staged-состав проверяются перед commit.
- Настоящий Chrome, localhost HTTP A → B → C: waiting update без принудительного
  reload; HTML/JS/CSS обновляются по нажатию; текст и результаты восстанавливаются;
  ошибка sessionStorage отменяет обновление с повтором.
- Offline shell, отсутствие API/auth/query-кэша, отказ повреждённого/неполного
  набора, повтор foreground, защита выбранного файла, две вкладки, сохранение
  чужого кэша; ширины 390/393/430 без горизонтального overflow.
- Mobile standalone проверен эмуляцией. CDP PWA.install в окружении недоступен;
  это не тест реально установленной PWA или физического iPhone.
- D1 не запрашивается. Backend deploy не выполняется.

### Публикация

URL: `https://timashevanatoly10-blip.github.io/lexicon/`.
Pages публикует `main` из `/`, workflow `pages-build-deployment`.
Checkpoint-коммит создан локально:
`c68ce818fdd555f0caa87656c77e8094238e1a1f`.
Локальный тег `cp-001` указывает на тот же коммит и не передвигается.
Frontend release ID: `2e3b88c7b8e30620eb4c`.
Перед commit проверены 29 отслеживаемых файлов: сигнатуры секретов не найдены,
SHA-256 всех 12 публичных assets совпали с Git index, backend-хеш совпал с импортом.

Первый push отклонён HTTP 403: Git Credential Manager использовал `mymatevessel`.
Повторный push с явно выбранным `timashevanatoly10-blip` ожидал авторизации
и остановлен до её завершения; фонового push не оставлено. GCM github list
показал только аккаунт `mymatevessel`. Необходимо завершить вход Git Credential
Manager под `timashevanatoly10-blip` с правом записи в этот репозиторий, затем
повторить разрешённый push main и cp-001 и проверить результат Pages.
Публикация CP-001 в GitHub/Pages не выполнена; существующий сайт не заявляется
обновлённым. Эта запись сохраняется отдельным документационным коммитом того же
этапа, без перемещения cp-001 и без начала CP-002.

### Результат отправки и публикации — 2026-10-29

Предыдущая блокировка авторизации устранена отдельно; для этой отправки проверены
Git Credential Manager, аккаунт `timashevanatoly10-blip`, `credential.useHttpPath=true`
и точный origin `https://github.com/timashevanatoly10-blip/lexicon.git`.
Другие проекты и аккаунты не использовались.

В main успешно отправлены:

- `c68ce818fdd555f0caa87656c77e8094238e1a1f` — CP-001 с Update и импортом;
- `556583e69238afbb49a5bf2b6cfbd6585d828d9a` — журнал проверок и прежней блокировки;
- `3ee0b3ed44b392f7ecfaada57c05568943bd11f2` — отдельный коммит строгой изоляции в AGENTS.md.

Удалённый тег `cp-001` проверен: указывает на исходный `c68ce818fdd555f0caa87656c77e8094238e1a1f`.
История и checkpoint-тег не переписывались.

GitHub Pages: source `main`, `/`, build_type `legacy`.
Публикация коммита `3ee0b3ed44b392f7ecfaada57c05568943bd11f2` завершилась `built`;
workflow [40886620902](https://github.com/timashevanatoly10-blip/lexicon/actions/runs/40886620902)
имеет статус `completed`, результат `success`. Завершение: 2026-10-29 16:57:11 МСК.
Проверен адрес `https://timashevanatoly10-blip.github.io/lexicon/`:
все 13 публичных файлов (SW и 12 app-shell assets) вернули HTTP 200,
SHA-256 каждого совпал с подготовленной версией. Frontend release:
`2e3b88c7b8e30620eb4c`.

Эта запись результата отправляется последующим документационным коммитом того же
этапа. Она не меняет frontend fingerprint и не создаёт CP-002. Cloudflare deploy,
изменения Worker/D1, секретов или других облачных ресурсов не выполнялись.

### Ограничение первого выпуска (сохраняется)

В уже открытом legacy-frontend нет кода кнопки Update. Для перехода на саму
инфраструктуру пользователь один раз закрывает старые окна/вкладки и открывает
LEXICON заново. Следующие frontend-релизы обнаруживаются и применяются по кнопке.
Production A → B с уже внедрённым механизмом в этом первом выпуске не заявляется;
реальный цикл проверен локальным HTTP-сервером.

## CP-002 — LEXICON ChatGPT MCP (2026-10-29)

Разрешены пользователем: полный цикл реализации, локальные тесты, backup,
совместимая additive D1 migration, commit/tag/push main и deploy существующего
lexicon-worker. Новые ресурсы, frontend/Pages изменения и CP-003 не входят в этап.
CP-001 и его тег остаются неизменными. CP-002 до этого свободен локально и в origin;
аккаунт GCM `timashevanatoly10-blip`, push permission и точный origin проверены.

Функциональный commit: `CP-002: LEXICON ChatGPT MCP`, неизменяемый тег `cp-002`.
SHA коммита и фактическая публикация записываются последующим документационным
коммитом этого же этапа; данная подготовительная запись не утверждает deploy.

Состав: `backend/mcp/{common,oauth,transport}.js`, общие операции
`backend/services/dictionaries.js`, подключение в `backend/worker.js`, migration
`backend/migrations/0001_mcp.sql` и migrations_dir в существующем Wrangler config;
`tests/mcp.cjs`, синтетическая схема, dev MCP SDK/lockfile;
`scripts/mcp-ops.cjs`, `scripts/mcp-smoke.cjs`, `scripts/verify-github.cjs`;
правила AGENTS, карта, документация backend и инструкции MCP.
Реализованы пять tools, OAuth PKCE/DCR, server-side mapping прежнего owner,
scope/resource checks, refresh rotation/revocation, owner isolation,
атомарное добавление до 50 карточек, idempotency и нормализованные дубли.
Существующие переводы/meta не заменяются, MCP не вызывает AI API.

Проверки до публикации:

- `npm run test:mcp`: PASS — реальный локальный workerd/D1, официальный MCP SDK,
  initialize/list/call, PKCE/CSRF/code replay, refresh reuse/expiry, scopes,
  resource и чужой owner, create/read/search, одинаковые названия, pagination,
  Unicode/case/whitespace duplicates, batch 50/51, concurrent request_id/insert,
  validation и rollback транзакции при искусственной ошибке второго INSERT,
  регрессия прежнего REST list/create/add и формат fullCard.
- `node --check` Worker и служебных скриптов; `git diff --check`: PASS.
- frontend build/check: прежний fingerprint `2e3b88c7b8e30620eb4c`, публичные
  файлы не изменены. Ручной deploy/настройки Pages не выполняются.
- Production source до изменения совпал с CP-001/import; bindings и правильная
  D1 подтверждены через Cloudflare API без вывода значений vars/secrets.
- SQL backup сохранён вне Git в `.wrangler/cp002/private/`, SHA проверен;
  восстановление в SQLite, применение точной migration и backfill локально
  сохраняют хеши всех исходных полей трёх таблиц. Нормализационных конфликтов,
  пустых ключей и неверного ownership до миграции нет.

SHA-256 `backend/worker.js`:
`9bc87a9462c3a4f536eaa2f4a3c7ba3f06aa5c24a8307da7cfc38daf3e070111`.
Это entry module, полный runtime включает перечисленные imports.
SHA-256 готового bundled deploy artifact `worker.js`:
`05de91f352f29ee72592fbddf1225296f4bdce76aa0676b48b4292175b7ed6a6`.
SHA-256 migration: `f90520368303e22fdcb0cb6779a23803054657f9f48fe490533c5c78dd7ab480`.
Перед deploy артефакт повторно собирается из чистого commit и проверяется
по хешу; после deploy сравниваются опубликованный модуль и прежние bindings.

Подключение/примеры: [MCP_CONNECT.md](MCP_CONNECT.md). Реальное подключение через
UI ChatGPT выполняется пользователем отдельно; SDK-тест не выдаётся за UI-тест.
Production smoke предусмотрен только на чтение словарей с отдельным временным
OAuth grant и его отзывом; никакого тестового мусора в словарях.
Rollback — согласованный revert/deploy кода, без DROP новых колонок/таблиц,
без перемещения cp-002 и без удаления пользовательских записей.

### CP-002 — зафиксированная версия перед публикацией

Функциональный commit и тег cp-002:
`ffce58bc0d33f53d8442f00570eeda36150071d0`.
Следующий документационный commit сохраняет этот manifest; cp-002 не перемещается.
Содержимое runtime в нём совпадает с функциональным checkpoint. Для push main
используются skip-CI маркеры, чтобы не запрашивать публикацию frontend зеркал;
их настройки и файлы не меняются. Backend deploy выполняется отдельно Wrangler.
На момент этой записи production migration/deploy ещё не выполнялись.

### CP-002 — подтверждённая production-публикация, 2026-10-29 19:58 МСК

- Функциональный checkpoint `ffce58bc0d33f53d8442f00570eeda36150071d0`, тег
  `cp-002` отправлены в разрешённый origin. Тег указывает на этот commit и
  не передвигался. CP-001 неизменён. Commit manifest перед deploy:
  `76e52e0bd1f7ee37c888196ca9843081b8a789ee`; он также отправлен в main.
- Перед deploy рабочее дерево чистое; повторный dry-run дал тот же SHA-256
  artifact `05de91f352f29ee72592fbddf1225296f4bdce76aa0676b48b4292175b7ed6a6`.
  Весь опубликованный модуль, включая imports, скачан через Cloudflare API
  после deploy и совпал с этим artifact по SHA-256.
- Проверенный SQL backup и восстановление выполнены до production migration.
  `0001_mcp.sql` применена Wrangler migrations runner в существующую lexicon-db;
  backfill менял только новые normalized_word/search_text с условием совпадения
  прежних полей. NULL ключей после backfill нет. Исходные словари/карточки/links
  не удалялись и не перезаписывались; новой D1/Worker не создавалось.
- Deploy выполнен локальным Wrangler с `backend/wrangler.jsonc`, только
  существующий `lexicon-worker`, account `e7dd176c5580b561da2048b23ed5f6c0`.
  Активный deployment: `c2e16325-ebe1-4304-8953-5d427c89792d`.
  Worker version: `7930c8e7-be50-43ec-adb0-3d06829a1ce0`, доля **100%**.
- Перед deploy сверены account/name, существующие settings/vars и единственная
  DB `6e63edd9-166b-400a-a644-caf474dc0ce6`. После deploy все прежние binding
  names/types и DB ID сохранены, значения plain_text vars совпали, включая
  ACCESS_TOKENS. DEEPL_API_KEY/OPENAI_API_KEY сохранены как secret_text;
  их значения не читались, не изменялись и не публиковались. Секреты не задавались
  заново через Wrangler. Новых OAuth client secrets или API keys не создавалось.
- Опубликован `https://lexicon-worker.timashevanatoly10.workers.dev/mcp`.
  Production smoke официальным MCP SDK: initialize, tools/list (пять tools),
  tools/call list/get/search — PASS. Проверены существующий owner mapping и
  совпадение ID с прежним `/api/dictionaries`, чтение сохранённой карточки, поиск.
  Без OAuth /mcp и прежний API дают 401, запись с read-only grant запрещена.
  Прежний авторизованный API вернул 200 и корректный ответ.
- Smoke создавал только временные служебные OAuth client/code/grant записи;
  grant успешно отозван. **Ноль** тестовых словарей/слов и пользовательских
  изменений. Production create/add намеренно не выполнялись: их транзакции,
  idempotency и regression проверены локально на синтетической D1.
- Frontend-файлы и fingerprint прежние; ручных публикаций и изменений настроек
  GitHub Pages / Cloudflare Pages нет. Их автоматический статус этим этапом
  не проверялся. Skip-CI маркеры не являются доказательством состояния зеркал.

Эта запись сохраняется последующим документационным коммитом того же CP-002
и push main без нового deploy и без перемещения cp-002. Подключение приложения
в интерфейсе ChatGPT остаётся отдельным пользовательским шагом: developer mode,
custom MCP URL, OAuth, браузерное согласие с существующим LEXICON-ключом.
UI ChatGPT не автоматизировался, фактическая совместимость интерфейса/политик
конкретного тарифа пока не подтверждена. Сервер и стандартный SDK проверены live.

### CP-002 — исправление browser OAuth consent

Пользователь сообщил реальный HTTP 403 invalid_origin после отправки формы.
В установленном Chrome на локальном Worker воспроизведено: response header
`Referrer-Policy: no-referrer` приводит к browser form POST с `Origin: null`,
без Referer, при корректных cookie/CSRF. Transport правильно отвергает такой
Origin. Прежние HTTP/SDK-тесты вручную задавали Origin и не выявляли эту ошибку.
Отдельно воспроизведено: CSP form-action self блокирует cross-origin callback
после успешного POST/303.

Исправление: same-origin referrer policy для consent, disconnect и redirect;
CSP consent разрешает self и единственный точный callback проверенного клиента
(нормализованный URL). Чужие/null Origin не разрешены; отсутствие Origin на POST
формы, несовпадение CSRF/cookie, неподтверждённый redirect по-прежнему отвергаются.
PKCE, scopes, owner mapping, D1/schema и legacy API не меняются.

Добавлены `tests/oauth-browser.cjs`, npm test:oauth-browser и безопасный live
`scripts/oauth-browser-smoke.cjs`. Браузерные тесты перехватывают callback через
CDP до обращения к ChatGPT. Проверены негативные сценарии missing/null/foreign
Origin, wrong CSRF, no cookie, foreign redirect и полный положительный поток.
Повторно пройдены MCP/OAuth, транзакции и прежние REST-тесты, syntax/diff checks.
Frontend fingerprint прежний. Секретов в исходниках не обнаружено.

Предпубликационный bundled SHA-256:
`a987f137bfc58209d640784f94413c5438f683553bcb3827c4660e7cb18ac999`.
Deploy guard принимает только предыдущий подтверждённый CP-002 artifact
`05de91f352f29ee72592fbddf1225296f4bdce76aa0676b48b4292175b7ed6a6`;
другая production-версия останавливает публикацию. Миграции не выполняются.
Исправление сохраняется отдельным commit того же CP-002, без CP-003 и без
перемещения cp-002 (`ffce58bc0d33f53d8442f00570eeda36150071d0`).
Фактический deployment и live smoke записываются после публикации.

#### Результат исправления — 2026-10-30 00:12 МСК

Исправление commit `d89fcf2c6c066cde2c77db24f00f1ffb70b3cf80` отправлено в main
`timashevanatoly10-blip/lexicon`. Тег cp-002 остаётся на
`ffce58bc0d33f53d8442f00570eeda36150071d0`; CP-003 не создавался.
Чистый commit повторно собран, SHA-256 artifact совпал с предпубликационным.
Deploy только существующего lexicon-worker выполнен; опубликованный модуль
скачан через Cloudflare API и совпал с artifact по SHA-256:
`a987f137bfc58209d640784f94413c5438f683553bcb3827c4660e7cb18ac999`.

- Deployment: `4bb5c9dc-d775-4fc1-9bd8-b878d44e69aa`.
- Version: `c44288f6-3673-4e75-8f9d-c4383f78bd08`, 100% трафика.
- До/после deploy проверены имена/типы всех прежних bindings, точный DB ID,
  сохранность значений plain_text vars. Secret_text bindings сохранены без
  чтения/изменения значений. Wrangler config и D1 schema не менялись; миграций,
  записи пользовательских словарей/слов и публикаций frontend не было.
- **Live Chrome form PASS:** настоящая production-страница, browser POST
  application/x-www-form-urlencoded с собственным Origin/Referer и secure CSRF
  cookie, HTTP 303, переход на разрешённый callback, state/issuer, PKCE exchange.
  Callback перехвачен CDP до обращения к ChatGPT; Referer на чужой домен не ушёл.
  Это проверка браузерного OAuth, а не автоматизация UI аккаунта ChatGPT.
- **Live MCP/legacy smoke PASS:** пять tools, SDK initialize/list/call,
  существующие словари/карточки/поиск и прежний API, запрет без авторизации и
  запрет записи с read-only scope. Оба временных smoke grants отозваны.
  Ноль тестовых словарей/слов. Opera отдельно не запускалась.

Нужно начать подключение в ChatGPT заново, чтобы загрузить новую HTML-форму с
исправленными заголовками; уже открытая старая форма сохраняет старую policy.
Результат фиксируется документационным commit того же CP-002 без нового deploy
и без перемещения checkpoint-тега.

## CP-003 — Full LEXICON dictionary management (2026-10-30)

Пользователь разрешил реализацию, tests/commit/tag/push, backup/additive migration
и deploy существующего lexicon-worker, без тестовых удалений production-данных.
Номер cp-003 свободен локально и в origin; CP-001/cp-001 и CP-002/cp-002 неизменны.
GitHub account `timashevanatoly10-blip`, exact origin и push permission проверены.

Состав checkpoint: общий AI module (извлечён исходный REST pipeline), durable
word-tasks и fullCard validator, shared legacy/MCP deletions, девять MCP tools,
новые delete scopes/consent, `0002_full_cards.sql`, tests/full-cards, расширенные
MCP regression fixtures, live generator check, safeguards/production smoke и
документация [CP003_MCP.md](CP003_MCP.md). Frontend assets/config неизменны.
Исходники и документация до checkpoint ещё не считаются отправленными в GitHub.

Проверки до публикации:

- `npm run test:full-cards`: PASS, реальные локальные workerd/D1, семь независимых
  owners, все три панели, atomic commit, нормализованные дубли, concurrent submit,
  idempotency, status без расходов, HTTP error/partial/uncertain, bounded explicit
  retry, daily budget и crash recovery; exact-ID подтверждаемое удаление,
  changed-target/replay/cross-owner denial, shared legacy REST deletion и AI.
- Настоящие frontend normalizers и HTML renderers извлечены из app.js для tests;
  полные сохранённые center/left/right показывают значения/примеры, мнемонику,
  ассоциации и грамматику. Frontend не изменялся, не создавалась другая карточка.
- `npm run test:mcp`, `npm run test:oauth-browser`: PASS, SDK/OAuth/PKCE/CSRF/
  scopes/изолированные owners/прежняя atomic запись и REST, настоящая Chrome form.
  Старый быстрый atomic writer тестируется через INTERNAL fixture-only route;
  публичный MCP принимает только words strings и больше не предлагает quick mode.
- `scripts/full-card-live.cjs`: три реальные генерации текущим LEXICON pipeline
  контрольного слова contactor, все панели и parts согласованы; ноль D1-словарей
  или слов создано. Данные private cache не входят в Git. Повтор теста
  `LEXICON_USE_LIVE_CARD=1 npm run test:full-cards` провёл реальные ответы через
  новые задачи, D1 save и frontend renderers без новых платных API calls.
- JS syntax и diff checks, frontend build/check PASS, release прежний
  `2e3b88c7b8e30620eb4c`.
- Перед migration выполнен SQL export существующей DB в игнорируемую
  `.wrangler/cp003/private/`. Restore + exact migration проверены в SQLite;
  хеши исходных полей dictionaries/dictionary_words/public_dictionary_links
  совпали до/после. Секреты и backup не входят в Git.

Entry `backend/worker.js` SHA-256:
`fe9871cbe25ec1d6782d6de1f9aa37e77fb57fa4992a3f73c2c6c51364ecfa4d`.
Bundled runtime artifact SHA-256:
`a2bf736b246abd316f00b2deaff3ed5d884c4c75477ed5e7713dcecafb20ee6e`.
Migration SHA-256:
`20251d746e38b90784bd3062ceada0d30688f88269545c908447b13de6ab40c1`.
Deploy guard требует предыдущий production artifact
`a987f137bfc58209d640784f94413c5438f683553bcb3827c4660e7cb18ac999`,
совпадение settings/vars/DB и сохранение всех bindings/secrets. После deploy
будут проверены опубликованный hash и текущий deployment/version, а также
read-only production MCP/REST и Chrome OAuth smoke.

На момент этой подготовительной записи production migration/deploy CP-003 ещё
не выполнялись. Пользовательский словарь «кодекс» и другие записи не удалялись.
Live запись/удаление в пользовательских словарях в smoke не предусмотрены.
Новое поколение требует продолжения через continue_word_task, а удаление —
повторного OAuth с delete scopes и явного подтверждения. Общая стоимость API
не фиксируется в долларах; лимиты и неопределённые сбои подробно описаны в инструкции.

### Зафиксированная версия CP-003 перед production

Функциональный commit и неизменяемый тег cp-003:
`34becb2331f95818546a76a9445d3d85ba2ebb8f`.
Этот manifest сохраняется отдельным документационным commit того же этапа;
runtime не меняется. После push и перед deploy артефакт повторно собирается
из чистого HEAD, затем проверяются baseline Worker и все прежние bindings.
Skip-CI маркеры запрашивают пропуск frontend-публикаций; frontend не изменён.
Эта запись не утверждает завершение migration/deploy.

### CP-003 — production подтверждён 2026-10-30 01:33 МСК

- Функциональный commit `34becb2331f95818546a76a9445d3d85ba2ebb8f` и тег cp-003
  отправлены в разрешённый GitHub. Тег неизменяем; предыдущие checkpoint-теги
  сохранились. Manifest commit `e56edcdbc6cce1ff91bb5afd87f0978b71546b93`
  также отправлен; это чистая версия, из которой выполнен deploy, runtime тот же.
- Резервная копия проверена восстановлением и exact migration hash. Wrangler
  применил `0002_full_cards.sql` к существующей lexicon-db; четыре новые control
  tables подтверждены. Migration не содержит изменения/удаления прежних записей.
  Новых Workers, D1, bindings или secret values не создавалось.
- Повторный dry-run дал тот же bundled SHA-256:
  `a2bf736b246abd316f00b2deaff3ed5d884c4c75477ed5e7713dcecafb20ee6e`.
  Перед deploy production соответствовал предыдущему CP-002 artifact;
  settings и plain vars совпали с reviewed config, DB ID точный.
- Deployment существующего lexicon-worker:
  `277f03e5-3404-4223-9490-34466c694dc8`.
  Version `61231223-3a34-4154-938b-95eaa8d235bd`, **100%** трафика.
  Опубликованный модуль скачан через Cloudflare API и совпал с dry-run по SHA-256.
  Все прежние binding names/types и DB ID сохранены; plain vars сравнивались
  по значениям, включая ACCESS_TOKENS. Secret_text OPENAI_API_KEY/DEEPL_API_KEY
  сохранены без извлечения значений и без повторного задания/ротации.
- Live standard MCP SDK initialize/list/call: PASS. Опубликованы девять tools;
  существующие словари/карточки/поиск и прежний REST API работают. Без OAuth —
  отказ, write через read-only grant запрещён. Удаление/запись словарей в smoke
  не выполнялись. Результаты реальной генерации и локального end-to-end с этими
  ответами описаны выше; live generation-task с пользовательской записью не запускался.
- Live Chrome OAuth POST/303/callback/PKCE: PASS. Callback перехвачен до внешней
  сети; UI аккаунта ChatGPT не автоматизировался. Оба временных smoke grants
  успешно отозваны. Пользовательский словарь «кодекс» не трогали.
- Frontend assets и release прежние; сайтов/настроек Pages не меняли и не
  публиковали вручную. Их автоматический статус этим этапом не проверялся.

Для проверки из ChatGPT нужно обновить tools и заново авторизоваться для новых
delete scopes; старые grants не расширялись. Все destructive проверки выполнены
на synthetic fixtures, а не на существующих пользовательских данных. Полная
генерация требует последовательного continue_word_task; остановленный чат можно
продолжить по task_id. Failed/uncertain не выдаются за полный успех. Стоимость
зависит от tokens/model; обычно три старта на новое слово, explicit retry
ограничен и может оплачиваться дополнительно. Подробности — CP003_MCP.md.

Эта запись результата отправляется отдельным документационным коммитом CP-003
без нового deploy, без перемещения cp-003 и без начала CP-004.

## CP-004 — Dictionary folders for LEXICON

Подготовка 2026-10-30. Предыдущий HEAD `37ba9d5e25f97b28173fa1d5b0419f912761b92f`,
cp-003 `34becb2331f95818546a76a9445d3d85ba2ebb8f`; прежние теги сохраняются.
Этот этап явно разрешает GitHub push, миграцию существующей lexicon-db и deploy
существующего Worker и обоих существующих frontend-сайтов; новых ресурсов нет.

Состав: отдельная модель/навигация/UI/CSS папок, узкий adapter app.js,
GET/POST dictionary-tree, additive migration 0003, synthetic backend/browser
tests, frontend build manifest, release verification и документация.
Quick Preview показывает только один уровень; Full Folder/ID stack/history;
верхний toolbar и атомарный mixed Move; safe folder Delete возвращает словари
в корень. Старый dictionary delete остаётся отдельно с прежним подтверждением.
Исправлен усечённый owner cache key и отключена автоматическая загрузка старого
кэша в пустой облачный список. Карточки и Inbox не мигрируются.

Проверки и ограничения подробно в CP004_FOLDERS.md. Backup существующей D1
экспортирован в игнорируемую .wrangler/cp004/private, восстановлен локально;
0003 применена к восстановленной копии. Хеши всех прежних таблиц до/после
совпали. Старый Worker совместим: схема dictionaries не меняется, новые связи
находятся в отдельных таблицах. Никаких пользовательских словарей/слов в
production smoke не создаётся и не удаляется.

Перед deploy guard требует CP-003 bundled SHA-256
`a2bf736b246abd316f00b2deaff3ed5d884c4c75477ed5e7713dcecafb20ee6e`,
точные account/Worker/DB, прежние settings/plain vars и имена secrets.
Сверяются dry-run artifact и реально опубликованный модуль. GitHub и CF Pages
читаются только для точных LEXICON repo/project, сравниваются все frontend
assets по SHA-256. Эта подготовительная запись не утверждает факт публикации;
commit/release/deployment и фактические результаты будут дописаны после неё.

### Проверки CP-004 перед публикацией

PASS: test:dictionary-folders (включая принудительный mid-batch rollback без
receipt/частичного переноса), test:dictionary-folders-ui во всех трёх viewport,
test:mcp, test:full-cards, test:oauth-browser, test:pwa, build/check:frontend,
syntax всех JavaScript и git diff --check. Новая DDL также включена в CP-003
full-cards regression; проверено сохранение deleted=1 при каскаде placement.
В UI реально проверены создание/удаление synthetic словаря внутри папки и Enter
с сохранением трёх панелей; AI ответы в этом прогоне — fixtures, без платных API.
Browser проверки выполнялись в установленном Chrome. Реальная установка PWA
через CDP недоступна; viewport/standalone simulation не является iPhone/Safari.
Frontend release: `2b81b77de37967114475`, 15 public assets плюс sw.js.
63 candidate files проверены: credential signatures отсутствуют, private backup
и runtime receipts игнорируются, ACCESS_TOKENS/OpenAI/DeepL отсутствуют в vars.

Production migration 0003 применена к существующей lexicon-db после backup:
четыре новые таблицы подтверждены через Cloudflare API. История migrations
предварительно проверена (0001/0002), никаких прежних строк migration не меняла.
На момент этой записи новый Worker/frontend ещё не опубликованы.

### CP-004 — проверка первой публикации и Pages PWA correction

Функциональный commit/tag cp-004:
`df6d1702360fae0f95cd50e654bb13b2cf409104`, push main/tag успешен.
Backend опубликован из этого чистого commit: bundled SHA-256
`8371f8992694015c8b91a10c89921a6e7133c6482064986b1a6c6437429bc18d`;
исходный backend/worker.js SHA-256
`4103d6e103ea2aa221ade8cb2b7688f5433c668e302f05177f08d466db7a0dff`.
Deployment `8f169044-f2dc-47c0-9d46-b2dc42b62d13`, version
`4db850ab-fa70-46b3-b5ee-276b546fb28f`, 100%. Settings, plain vars (включая
ACCESS_TOKENS), DB ID и все secret binding names/types сохранены. Опубликованный
модуль скачан через API и совпал с dry-run artifact по хешу.

Read-only production tree для всех настроенных владельцев, REST, standard MCP
SDK и Chrome OAuth POST/CSRF/303/PKCE: PASS, временные grants отозваны.
Сравнение production с backup после deploy: все поля dictionaries,
dictionary_words (включая meta.fullCard), public_dictionary_links,
inbox_folders/items/tree_order совпали. Пользовательские записи не создавались
и не удалялись. Оба сайта открыли новое дерево через реальный CORS в Chrome.

GitHub Pages built для df6d170, Cloudflare Pages production
`b31d355b-3bdd-467c-b634-e51bfcba3623` success, тот же commit.
Сверка файлов выявила ранее не проверенное поведение CF Pages: `/index.html`
даёт 308 на `/`. Это мешало строгому PWA install (redirected запрещён), поэтому
в рамках того же CP-004 подготовлен дополнительный frontend correction:
HTML загружается из канонического корня, cache key и проверка байтов остаются.
Новый release `3f71534d9b2b6f591e9d`. test:pwa прошёл, включая canonical redirect
в A→B/standalone fixture. Проверяющий скрипт также использует root для HTML и
имеет явный --browser transport. Backend не меняется и повторно не deploy-ится.
Существующий cp-004 **не перемещается**, CP-005 не создаётся. Фактический SHA
этого correction и итоговые frontend receipts будут записаны после публикации.

### CP-004 — итог подтверждён 2026-10-30 12:31 МСК

- Checkpoint cp-004 неизменяем: `df6d1702360fae0f95cd50e654bb13b2cf409104`.
  Frontend correction: `8b19e8ab79d74c3e7186f4afc1d13d9bcf2f011b`.
  Оба commit отправлены в main разрешённого GitHub. cp-001/002/003 не менялись.
- Worker остался на deployment `8f169044-f2dc-47c0-9d46-b2dc42b62d13`,
  version `4db850ab-fa70-46b3-b5ee-276b546fb28f` (100%); backend correction
  не требовался, повторного deploy Worker после frontend fix не было.
- GitHub Pages https://timashevanatoly10-blip.github.io/lexicon/: **built**,
  frontend commit `8b19e8ab79d74c3e7186f4afc1d13d9bcf2f011b`.
- Cloudflare Pages https://mylexicon.pages.dev/: production deployment
  `c25adb20-bdb1-4a1c-ac5e-b4bddfc812b3`, **success**, тот же frontend commit.
- Итоговый frontend release `3f71534d9b2b6f591e9d`. Проверены SHA-256 всех
  16 опубликованных файлов на **каждом** сайте через
  `node scripts/frontend-release.cjs verify --browser`. HTML читается через
  канонический root, остальные assets — по точным путям, редиректы запрещены.
  Дополнительный реальный Chrome smoke с owner token подтвердил отображение
  дерева и authenticated CORS на обоих сайтах без пользовательских записей.
- Реальная production A→B проверка на GitHub Pages: A release
  `2b81b77de37967114475` оставался активным после публикации B, затем появилась
  кнопка Update; одно нажатие активировало `3f71534d9b2b6f591e9d`, черновик
  сохранился, кнопка исчезла. На CF Pages новая версия реально установила
  Service Worker и открыла app shell offline после reload. Это headless Chrome,
  не физический iPhone и не доказательство установки iOS PWA.
- Резервная копия остаётся локально в ignored private directory. Production
  сверка всех прежних dictionary/card/public-link/Inbox полей с backup — PASS.
  Никаких примерных папок/словарей или других тестовых пользовательских данных
  в production не создавалось и не удалялось. Секреты не ротировались.

Ограничения: операции организации online; old cache v1 не импортируется;
folder+dictionary mixed Delete разделён по безопасным сценариям; Delete самих
словарей необратим и требует прежнего отдельного подтверждения. Установленная
PWA/реальный iPhone требуют ручной проверки из инструкции CP004_FOLDERS.md.
Этот итог сохраняется отдельным документационным commit того же CP-004 без
перемещения тега и без нового backend deploy. CP-005 не начат.
