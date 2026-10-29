# LEXICON: структура словарей для проектирования MCP

Дата проверки: 2026-10-29. Это снимок метаданных, не миграция и не резервная копия данных.
Account ID: `e7dd176c5580b561da2048b23ed5f6c0`.
D1: `lexicon-db`, binding `DB`, ID `6e63edd9-166b-400a-a644-caf474dc0ce6`.

В рамках отдельно разрешённого чтения схемы выполнен только SELECT из
`sqlite_schema` для таблиц dictionaries, dictionary_words, public_dictionary_links
и их индексов/триггеров. Содержимое пользовательских таблиц не читалось;
DDL/DML, миграции и изменение конфигурации не выполнялись.

## Подтверждённые таблицы

```sql
CREATE TABLE dictionaries (
  id TEXT PRIMARY KEY,
  owner_token_hash TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE dictionary_words (
  id TEXT PRIMARY KEY,
  dictionary_id TEXT NOT NULL,
  owner_token_hash TEXT NOT NULL,
  word TEXT NOT NULL,
  transcription TEXT DEFAULT '',
  translation TEXT DEFAULT '',
  part_of_speech TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  meta TEXT DEFAULT '{}',
  FOREIGN KEY(dictionary_id) REFERENCES dictionaries(id) ON DELETE CASCADE
);

CREATE TABLE public_dictionary_links (
  id TEXT PRIMARY KEY,
  owner_token_hash TEXT NOT NULL,
  dictionary_id TEXT NOT NULL,
  share_id TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## Именованные индексы

| Индекс | Таблица / поля | UNIQUE |
|---|---|---|
| idx_dictionaries_owner | dictionaries(owner_token_hash) | Нет |
| idx_dictionary_words_dictionary | dictionary_words(dictionary_id) | Нет |
| idx_dictionary_words_owner | dictionary_words(owner_token_hash) | Нет |
| idx_dictionary_words_unique | dictionary_words(dictionary_id, word) | Да |
| idx_public_dictionary_links_dictionary_id | public_dictionary_links(dictionary_id) | Нет |
| idx_public_dictionary_links_share_id | public_dictionary_links(share_id) | Нет |

Также присутствуют внутренние autoindex для PRIMARY KEY и UNIQUE.
В выбранных таблицах триггеры не обнаружены. Схема не объявляет NOCASE или
нормализованный ключ слова; title не уникален. FK в DDL подтверждён, но фактический
режим enforcement в runtime отдельно не проверялся.

Не проверялись: пользовательские слова, количество/наличие дублей, заполненность
meta, размеры словарей, история миграций и остальные таблицы базы. Нельзя утверждать,
что индекс нормализованных слов можно добавить без предварительного аудита конфликтов.
