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
