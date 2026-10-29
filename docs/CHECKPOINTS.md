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
Commit/push/tag и фактический результат будут записаны после выполнения.
Точный checkpoint-коммит определяется тегом cp-001; тег не передвигается.

### Ограничение первого выпуска

В уже открытом legacy-frontend нет кода кнопки Update. Для перехода на саму
инфраструктуру пользователь один раз закрывает старые окна/вкладки и открывает
LEXICON заново. Следующие frontend-релизы обнаруживаются и применяются по кнопке.
Production A → B с уже внедрённым механизмом в этом первом выпуске не заявляется;
реальный цикл проверен локальным HTTP-сервером.
