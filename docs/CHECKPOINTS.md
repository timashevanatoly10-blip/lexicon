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
