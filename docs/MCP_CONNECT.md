# ChatGPT ↔ LEXICON MCP (CP-002)

URL: `https://lexicon-worker.timashevanatoly10.workers.dev/mcp`.
Это Streamable HTTP в существующем `lexicon-worker`, с той же DB `lexicon-db`.
Production-статус и точные версии указаны в [CHECKPOINTS.md](CHECKPOINTS.md).

## Подключение в ChatGPT

В ChatGPT включите Developer mode, если он доступен вашему тарифу и разрешён
администратором workspace. В Settings → Apps / Connectors создайте custom
MCP app/server (названия элементов интерфейса могут меняться). Укажите URL выше,
выберите OAuth. Сервер поддерживает discovery и Dynamic Client Registration для
публичного клиента, `token_endpoint_auth_method=none`: статический client secret
не нужен. Если интерфейс требует заранее заданный client ID, не подставляйте
ключи OpenAI/DeepL: нужна регистрация клиента через `/oauth/register` с точным
ChatGPT callback. Подключение через интерфейс ChatGPT выполняется отдельно.

Откроется страница согласия LEXICON. Введите **существующий ключ доступа LEXICON**
только в password-поле на домене `lexicon-worker.timashevanatoly10.workers.dev`,
проверьте scopes и подтвердите. Не отправляйте этот ключ в чат, GitHub или URL.
Это связывает OAuth grant с SHA-256 существующего owner token, поэтому видны
прежние словари. Access/refresh token не используется как owner hash. Если ключ
LEXICON неизвестен, понадобится получить его у владельца безопасным способом;
создание другого ключа само по себе не переносит владение словарями.

Разрешённые callback: `https://chatgpt.com/connector_platform_oauth_redirect`
и `https://chatgpt.com/connector/oauth/<id>`, с точным совпадением после DCR.
Другие домены и пути отвергаются. OAuth использует code + PKCE S256, state,
resource `/mcp`, issuer в callback, одноразовый код (2 минуты), access token
(10 минут), rotating refresh token (30 дней), отзыв при повторе старого refresh.
В D1 хранятся только хеши кодов и токенов. Consent защищён CSRF и CSP.

Scopes: `lexicon.dictionaries.read` (list/get/search),
`lexicon.dictionaries.create`, `lexicon.words.write`; дополнительно `offline_access`.
Недостаточный scope даёт 403, отсутствующий/просроченный token — 401.
Удаление текущего legacy owner token из разрешённых отзывает доступ его grants.
Отозвать все свои MCP grants можно через `/oauth/disconnect`, подтвердив
существующий LEXICON-ключ в браузере. Словари это не удаляет.

## Инструменты и правила

| Инструмент | Параметры и результат |
|---|---|
| `list_dictionaries` | `title_query?`, `limit?`, `cursor?`; ID, title, note, word_count, next_cursor |
| `get_dictionary` | `dictionary_id`, `limit?`, `cursor?`; карточки существующего приложения |
| `create_dictionary` | `title`, `note?`, `request_id`, `allow_same_title?`; новый ID |
| `add_words` | `dictionary_id`, `request_id`, `words` (1–50); результат для каждого элемента |
| `search_words` | `query`, `dictionary_id?`, `match?`, `limit?`, `cursor?` |

Пагинация keyset по ID: limit 1–100 (по умолчанию 50), передавайте next_cursor
без изменений с теми же фильтрами/limit. Название ищется через list; при нескольких
вариантах ChatGPT должен уточнить ID. Создание с уже существующим нормализованным
названием возвращает варианты; `allow_same_title=true` явно разрешает новый словарь.
Названия не являются уникальными ключами, особенно при конкурентном создании.

`request_id` — уникальная строка 8–100 символов A–Z/a–z/0–9/_/-. Повтор с тем же
payload возвращает сохранённый результат; другое содержимое под тем же ID — конфликт.
Batch — одна транзакция D1, включая запись идемпотентности. Невалидный элемент или
ошибка БД отменяет весь batch. Дубли — NFC, регистр и схлопнутые пробелы:
существующая карточка сохраняется, внутри batch выигрывает первый элемент.
Статусы: `added`, `duplicate_existing`, `duplicate_in_batch`; возвращаются word ID.
У MCP нет инструментов удаления или перезаписи существующей карточки.

Карточка: word/translation обязательны; transcription, partOfSpeech,
meanings[{translation,meaning_ru?,usage?}], examples[{source,translation_ru}]
необязательны. Формируется существующий `meta.fullCard` с ready center; произвольный
HTML/meta не принимается. MCP не вызывает OpenAI или DeepL. Поиск exact/prefix —
по headword, contains — также по переводу, транскрипции и части речи; SQL-параметры
и экранирование LIKE. Unicode lower-case готовится сервером, не SQLite lower().

Примеры команд в ChatGPT после подключения:

- «Покажи мои словари с ID и числом слов. Найди словарь Maritime; если их несколько — спроси меня».
- «Прочитай словарь с ID …, проходя все страницы. Потренируй меня по этим карточкам в чате».
- «Создай словарь Navigation, используй новый request_id, верни его ID».
- «Добавь в словарь … слова anchor — якорь и mooring — швартовка, с транскрипцией и примерами. Не меняй существующие карточки».
- «Найди якорь во всех моих словарях, покажи ID словарей и карточек».

Запись может требовать подтверждения ChatGPT: проверьте tool permissions и политики
workspace. Включайте app только в нужных чатах; словари передаются модели по запросу.
Содержимое карточек считается недоверенными данными, а не инструкциями для tools.
Совместимость реального интерфейса ChatGPT проверяется при отдельном подключении;
успешный SDK-тест не означает, что app уже подключён пользователю.

## Проверки и обслуживание

`npm run test:mcp` — локальный workerd/Miniflare и синтетические владельцы A/B,
официальный MCP SDK. Проверяются OAuth, owner isolation, scopes, batch rollback,
конкурентные дубли, request_id, карточки и прежний REST. Production smoke:
`node scripts/mcp-smoke.cjs` — чтение текущих словарей, временный read-only OAuth
grant с последующим отзывом; никаких тестовых словарей/слов. Не запускать без
разрешения на production-проверку.

`npm run test:oauth-browser` — настоящая HTML form navigation в установленном
Chrome с локальным Worker/D1. CDP перехватывает все запросы, включая callback;
сетевых обращений к ChatGPT нет. Тест воспроизводит старые no-referrer →
Origin null → 403 и CSP-блокировку callback; проверяет исправленный POST/303,
cookie/CSRF, state/issuer/PKCE и отказы при отсутствии/подмене Origin, cookie,
CSRF и redirect_uri. Consent/disconnect используют Referrer-Policy same-origin,
чтобы browser POST сохранял Origin, не передавая Referer на чужой домен.
CSP формы согласия разрешает self и только проверенный callback этого клиента.
Origin null не допускается; Referer не заменяет проверку Origin и CSRF.
`node scripts/oauth-browser-smoke.cjs` повторяет реальную форму на production,
перехватывая callback до внешнего сетевого запроса. Ключи держит только в памяти,
выданный read-only grant отзывает; словари не изменяет.
После исправления browser OAuth от 2026-10-30 начните подключение в ChatGPT
заново: открытая ранее форма сохраняет старый Referrer-Policy до перезагрузки.

`scripts/mcp-ops.cjs` выполняет только фиксированные операции LEXICON:
backup → verify-backup → migrate → artifact → deploy, с проверкой точной цели,
backup hash, migration hash, чистоты Git, соответствия deploy artifact и сохранения
production bindings. Экспорт и receipts находятся только в игнорируемой
`.wrangler/cp002/private/`, содержат приватные данные и не публикуются.
Миграция additive: normalized/search поля, unique index и служебные MCP/OAuth
таблицы; исходные поля и записи сохраняются. Не откатывайте схему разрушительными
DROP: старый Worker совместим с дополнительными колонками; revert кода/deploy
требует отдельного разрешения. Уборка истёкших служебных OAuth-записей пока ручная,
без нового cron/ресурса. Исходники runtime не зависят от MCP SDK: он только dev/test.

Официальные сведения: [OpenAI MCP auth](https://developers.openai.com/plugins/build/auth),
[MCP server](https://developers.openai.com/plugins/build/mcp-server).
