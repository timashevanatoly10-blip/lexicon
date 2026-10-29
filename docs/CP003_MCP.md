# CP-003 — полные карточки и управление словарями

Сервер прежний: `https://lexicon-worker.timashevanatoly10.workers.dev/mcp`.
Аккаунт, Worker, DB и owners не заменяются. Фактические SHA/deployment —
[CHECKPOINTS.md](CHECKPOINTS.md). Frontend обоих сайтов не меняется.

## Полная карточка

Путь Enter в `app.js`: `handleWordTranslate` → `word_translate` →
`startWordSideRequests` с `word_left`/`word_right`. Обогащение словаря также
вызывает эти три режима и сохраняет `meta.fullCard`. DeepL в этом пути не
участвует: он остаётся доступен прежним функциям приложения.

Общий модуль `backend/services/ai.js` содержит извлечённые без изменения
семантики прежние prompts selection, запрос Responses API и парсеры. REST
`/api/ai` и MCP используют этот модуль и текущие OPENAI_MODEL/PROMPT_WORD_*.
MCP не имеет собственных сокращённых prompts или quick-mode. Существующий
внутренний CP-002 atomic writer используется только для сохранения готовых
карточек; из публичного MCP его быстрый контракт удалён.

`add_words` принимает `{dictionary_id, request_id, words:["contactor",...]}`,
1–50 английских слов/фраз. Перевод не нужен. Возвращает **task_id, не факт
добавления**. `get_word_task` только читает статус; `continue_word_task` выполняет
один шаг: начинает одну панель либо проверяет уже созданный provider response.
ChatGPT продолжает задачу с паузой не менее retry_after_seconds (5 секунд),
пока статус не completed. Если чат/лимит tools остановил выполнение, запрос
«Продолжи задачу <task_id>» безопасно продолжает сохранённую работу. Сам сервер
не запускает cron и не гарантирует завершение оставшихся панелей без continue.

OpenAI background Responses переживают отдельный HTTP-запрос; response ID
сохраняется в служебной D1 и не отдаётся клиенту. `store:true` позволяет
возобновить чтение результата; применяются правила хранения OpenAI Responses.
Фиксируется hash модели и трёх prompts: при их изменении задача останавливается
для проверки, вместо смешивания разных версий. Перед платной отправкой в D1
резервируются панель и бюджет. Одновременно на owner — одна активная панель,
не более трёх незавершённых задач и 150 начал генерации за UTC-сутки, включая
явные повторы. Max output — 12000 tokens на панель, включая reasoning.
POST timeout 25 секунд, GET 20 секунд; проверки provider response не создают
новую генерацию. Платный запрос не повторяется автоматически. Неопределённое
принятие запроса после сбоя → uncertain, требуется разбор оператором.

Готовые панели сохраняются. После явного одобрения дополнительных расходов
`continue_word_task` с `retry_failed:true,accept_additional_cost:true` повторяет
только failed panels, максимум две попытки на панель; ready не генерируются
заново. Повтор с тем же request_id возвращает ту же задачу. Пересекающиеся
незавершённые задачи одного owner не создаются. Квота — ограничитель числа
запросов/tokens, не фиксированная денежная цена. Стоимость зависит от действующей
модели, prompts, reasoning и output. Обычно три генерации на новое слово;
явный retry может стоить дополнительно. Ключи и billing settings не менялись.

Только после готовности **всех трёх панелей всех новых слов** и согласованности
parts of speech выполняется одна atomic D1 batch для карточек и idempotency.
Сохраняется существующий `meta.fullCard`: ready/source/center/left/right/errors/
startedAt/updatedAt. Центр содержит все части речи/значения/примеры прежнего
parser; обе стороны — полные JSON dashboards прежних prompts. Неполный JSON,
отсутствующие обязательные разделы, несовпадающие parts → failed, карточки не
сохраняются частично и успех полного создания не возвращается.
До commit панели остаются только в служебных таблицах, не в словарях.

Дубли: NFC + trim + схлопнутые пробелы + lower-case. Существующие карточки не
перезаписываются и не оплачиваются заново. Дубли внутри batch используют первую
карточку. Если прежний дубль сам был неполным, он сохраняется и перечисляется
в existing_incomplete_cards, complete=false. Автоматического повреждения/замены
старой карточки нет; удаление/повторное добавление — отдельное решение владельца.

## Tools и права

| Tool | Назначение / scope |
|---|---|
| list_dictionaries | ID, названия, число слов / dictionaries.read |
| get_dictionary | Сохранённые карточки, pagination / dictionaries.read |
| create_dictionary | Название + request_id, без перезаписи / dictionaries.create |
| add_words | Полная генерация по словам, очередь / words.write |
| search_words | Свои словари, pagination / dictionaries.read |
| get_word_task | Статус без платного вызова / dictionaries.read |
| continue_word_task | Возобновление генерации / words.write |
| delete_dictionary | Точный ID, подтверждение / dictionaries.delete |
| delete_word | Точные dictionary_id + word_id, подтверждение / words.delete |

Полные имена scopes имеют префикс `lexicon.`. Число owner tokens в ACCESS_TOKENS
не ограничивается двумя; OAuth всегда привязывает grant к прежнему owner hash.
Для новых scopes удаления **повторно подключите OAuth** и обновите tools в
ChatGPT. Действующие access tokens/owners не меняются, старым grants права не
добавляются автоматически. Чтение, создание и поиск сохраняют прежние контракты.

Удаление — отдельные destructive tools. Первый вызов только подготавливает
challenge и возвращает точную цель/число слов, confirmation_token и строку
`DELETE dictionary <id>` либо `DELETE word <id>`. ChatGPT должен показать цель
пользователю и запросить явное согласие. Второй вызов с токеном и точной строкой
может удалить только эту цель, этого owner, в течение пяти минут. Проверяется
снимок содержимого внутри той же D1 transaction; изменение цели → новый запрос
подтверждения. Replay не удаляет заново. Подтверждение человека обеспечивается
интерфейсом/политикой ChatGPT; не включайте автоматическое одобрение destructive
tools. Сервер не может криптографически доказать факт прочтения сообщения человеком.

Общие серверные delete operations используются MCP и прежним REST: слова
удаляются, public links словаря отключаются, затем удаляется сам словарь;
его незавершённые задачи отменяются. Слово удаляется ровно одно. Уже отправленный
provider request при отмене может завершиться и оплачиваться, но карточки не
сохраняются и следующие панели не запускаются. Ресурсы Cloudflare не удаляются.
Словарь «кодекс» на этапе CP-003 не удаляется.

## Проверки

- `npm run test:full-cards`: локальный workerd/D1, семь owners, полный цикл
  задач, provider mock, concurrency/дубли/идемпотентность/лимиты/ошибки/uncertain,
  подтверждаемое удаление и существующий REST AI. Удаления только synthetic fixtures.
- `npm run test:mcp`, `npm run test:oauth-browser`: MCP SDK, OAuth/PKCE/scopes,
  браузерная форма и регрессия внутренней atomic записи/прежнего REST.
- `node scripts/full-card-live.cjs`: три реальных текущих режима LEXICON для
  контрольного слова contactor, без записи в словарь. Успехи кэшируются только в
  игнорируемой `.wrangler/cp003/private/`. `LEXICON_USE_LIVE_CARD=1` при запуске
  full-cards теста прогоняет эти реальные ответы через новый task pipeline,
  сохранение meta и реальные normalizers/HTML renderers из app.js, без новых
  платных запросов. Это не live создание карточки в пользовательском словаре.
- `scripts/mcp-smoke.cjs` и `scripts/oauth-browser-smoke.cjs`: опубликованный
  Worker, read-only grants, девять tools, прежний API, браузерный OAuth. Ноль
  production test-словарей/слов и никаких пользовательских удалений.

`0002_full_cards.sql` — только четыре новые control tables и index в прежней DB;
исходные таблицы и данные не меняются. До применения — отдельный SQL export,
проверка SHA, restore и exact migration в SQLite, сохранность хешей исходных
полей. `scripts/mcp-ops.cjs` текущего CP-003 использует `.wrangler/cp003/private/`,
проверяет account/Worker/DB/settings/bindings, baseline artifact, чистый commit
и опубликованный hash. Секреты не извлекаются, не задаются заново и не попадают
в Git. Rollback кода не требует DROP новых таблиц; разрешение на rollback отдельно.

Примеры: «Найди Electrical и уточни ID при совпадении названий»;
«Добавь contactor, overload, insulation и дождись полных карточек»;
«Покажи статус задачи …»; «Удали слово … из словаря …» — затем отдельное
явное подтверждение точной цели в ChatGPT.

OpenAI: [Background Responses](https://developers.openai.com/api/docs/guides/background).
