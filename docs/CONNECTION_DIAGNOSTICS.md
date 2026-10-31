# CP-005 — Connection Reliability

Первичная диагностика выполнена 2026-10-30. Публикация CP-005 явно разрешена
2026-10-31. Backend, production D1, секреты и ресурсы не изменяются. Synthetic D1
используется только в локальных тестах. Фактические commit/tag и результаты
публикации двух существующих frontend-сайтов фиксируются в CHECKPOINTS.md.

## Подтверждённые наблюдения

1. В опубликованном frontend dictionaryApi/inboxApi выполняли единственный
   fetch без deadline. TypeError браузера превращался в утверждение о Worker/D1,
   хотя такой отказ не доказывает, что запрос вообще достиг Worker.
2. Последний корректный Inbox заменялся сообщением об ошибке; при повторном входе
   loading также скрывал прежний список. У загрузчика не было owner guard,
   включая финальный override V133. Запоздалый ответ мог влиять на новый сеанс.
3. Загрузка словарей могла заменять актуальное in-memory состояние снимком кэша,
   захваченным до запроса. Начальная загрузка/foreground/online не имели общего
   механизма объединения запросов. Dictionary tree имел собственные lifecycle
   слушатели; Inbox сопоставимого восстановления не имел.
4. Проверенный Worker: deployment `8f169044-f2dc-47c0-9d46-b2dc42b62d13`,
   version `4db850ab-fa70-46b3-b5ee-276b546fb28f`, 100%; опубликованный bundled
   SHA-256 `8371f8992694015c8b91a10c89921a6e7133c6482064986b1a6c6437429bc18d`.
   Совпадает с CP-004. Read-only проверки OPTIONS/GET обоих frontend origins
   вернули правильный Access-Control-Allow-Origin (204 и ожидаемый 401 без token).
   Постоянная ошибка текущего CORS этой проверкой **не воспроизведена**.
5. GraphQL Workers Analytics в окне 24 часа от `2026-10-29T15:54:21.895Z`:
   success 730, clientDisconnected 1, invocation errors 0. Это агрегированный
   снимок, не доказательство отсутствия обработанных HTTP 5xx и не корреляция
   с конкретным iPhone. Endpoint сохранённых Observability Logs/keys вернул
   HTTP 403, Cloudflare code 10104. Другие credentials/аккаунты не использовались;
   нужны права чтения Workers Observability в том же аккаунте для детального
   разбора исключений, лимитов и HTTP-статусов. Логи с payload не скачивались.

Точная транспортная причина пользовательского `Load failed` остаётся
**неподтверждённой**. Возможны сеть/DNS/TLS/CORS, разрыв после background или
ошибка загрузки тела. Отсутствует Safari Network trace со временем, origin и
HTTP/CF-Ray. Исправлены подтверждённые дефекты восстановления, а не выдана
гипотеза о Safari/D1 за установленный факт.

## Локальное исправление

`api-connection.js` подключён перед app.js, включён в frontend/PWA manifest.
dictionaryApi/inboxApi используют его; форма backend/REST/MCP не меняется.

- Только GET `/api/dictionaries`, `/api/dictionary-tree`, `/api/inbox`: до трёх
  попыток (исходная + два повтора), deadline 12 секунд **включая тело** на попытку.
  Ограниченный backoff с jitter; retries при транспортной ошибке, timeout и
  HTTP 429/502/503/504. Retry-After учитывается; длинный backoff прекращает цикл,
  чтобы не повторять раньше указанного сервером времени. При navigator.offline
  после первой неудачи дополнительных попыток нет.
- 401/403/404/409/500 не повторяются. Реальный 401 проходит прежнюю обработку
  блокировки авторизации, а сетевой отказ не удаляет token. POST/PUT/DELETE
  отправляются один раз, не получают автоматический deadline/abort/retry.
  При потерянном ответе записи явно сообщается о неопределённом результате:
  требуется сначала проверить список, а не слепо отправлять заново.
- Одновременные одинаковые owner-scoped GET делят один HTTP/retry цикл;
  bootstrap словарей также объединяется. Новый token не делит запрос старого.
  Ответы и ошибки прежнего владельца игнорируются; поздний 401 не стирает
  новый token. При смене владельца сбрасывается статус соединения.
- Последние корректные данные сохраняются при неудаче; неправильный формат
  ответа не считается пустым списком. Отдельный status/banner не заменяет
  карточки или Inbox. Успех другого endpoint не скрывает оставшийся отказ.
- Один механизм online/pageshow/focus/visibilitychange объединяет события и
  восстанавливает чтение без постоянного polling. Короткий возврат сети внутри
  throttle откладывается, а не теряется. При открытом dialog, черновике слова
  или открытом Inbox item восстановление не перерисовывает редактируемый UI;
  после закрытия dialog проверка может продолжиться. Есть кнопка повтора чтения.
- В diagnostics нет access token, URL с ID/query, содержимого карточек или raw
  HTTP body. Данные не добавляются в SW cache: он по-прежнему хранит только
  публичную оболочку. Update остаётся ручным, с прежней защитой черновиков.

## Может ли MCP мешать обычным запросам

Существующий CP-003 выполняет один provider start на владельца одновременно,
имеет бюджет 150 панелей/сутки, limit 50 слов/task и ограниченные provider
deadlines. D1 batch завершается **до** await внешнего AI. Чтение словарей не
проверяет generation lease и не ждёт завершения task.

Дополнительный regression test удерживает ответ синтетического AI провайдера;
обычный GET словарей того же владельца успешно завершается до освобождения
AI-запроса. Поэтому прямой глобальный lock на всё приложение не подтверждается.
Косвенная конкуренция возможна: общий Worker/account CPU, D1 quotas/queries и
рост размера полного REST ответа со всеми meta.fullCard. Массовую production
генерацию/нагрузочные платные запросы не запускали. Исторические 5xx/limits
без разрешения на logs не проверены. AI pipeline и его контракты не изменены.

## Проверки

- `npm run test:connection`: bounded retries/coalescing, HTTP non-retryable
  statuses, Retry-After, offline/deadline, разрыв тела, смена владельца, отсутствие
  write replay, независимые статусы endpoint и безопасная диагностика.
- `npm run test:connection-browser`: Chrome 390×844 с настоящими fetch failures,
  offline/online, медленными ответами, параллельными reads, lifecycle событиями,
  сохранением последнего списка и несохранённых форм, старым 401 после смены
  token, без повторного POST. WebKit в окружении отсутствует; background Safari
  воспроизведён только событиями lifecycle, не реальным iOS процессом.
- Регрессия: dictionary-folders (данные/UI в portrait, landscape, desktop),
  full-cards (включая MCP/GET concurrency), MCP, OAuth browser, PWA A→B/черновики/
  offline/no API cache/canonical HTML; frontend build/check, syntax/diff check.

Итог первичного локального прогона 2026-10-30: все перечисленные тесты PASS. Browser connection test
дополнительно проверяет настоящий context offline/online, сохранение черновика
слова/открытой формы папки при recovery и запоздалый 401 прежнего владельца.
WebKit отсутствует, PWA.install через CDP недоступен; установленная iOS PWA не
проверена. На тот момент локальный frontend release был `59b56f127fad96412ceb`, 16 public
assets плюс sw.js, файлы ещё не были в GitHub. Проверены 67 candidate files: syntax/credential-signature scan и diff
check PASS; backend diff отсутствует.

Для окончательной проверки на физическом iPhone после публикации нужен тест
с авиарежимом/возвратом из фона на обоих сайтах.
Если ошибка сохраняется: зафиксировать точное время с часовым поясом, сайт,
режим Safari/PWA и текст диагностики/HTTP-статус, без token и личных карточек.

Методика read-only аналитики:
[Workers Metrics GraphQL](https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-workers-metrics/),
[Workers Observability query API](https://developers.cloudflare.com/api/resources/workers/subresources/observability/subresources/telemetry/methods/query/).

## Финальная проверка CP-005 перед публикацией — 2026-10-31

Все regression suites повторены: connection, connection-browser, MCP,
full-cards, dictionary-folders, dictionary-folders-ui, oauth-browser, pwa: PASS.
Build/check:frontend PASS. Диагностика отдельно классифицирует TIMEOUT, NETWORK,
HTTP_401, HTTP_403, HTTP_429 и HTTP_5XX (без вывода исходного message/body).
Проверены hostile error messages с synthetic token/card sentinel: утечки нет.
POST/PUT/DELETE проверены на transport failure и HTTP 429/503: ровно одна попытка.
Итоговый frontend release `7bed10ba4dba9d64a448`, 16 assets плюс sw.js.

Read-only production smoke: `node scripts/connection-release-smoke.cjs check`.
Проверяет точный Worker hash/binding/deployment и оба frontend: искусственный
обрыв API в отдельной Chrome-сессии, сохранение списка, online-восстановление,
авторизацию/CORS и отсутствие write-запросов. Fault injection не достигает D1.
Режим watch-update оставляет реальные A-сессии обоих сайтов открытыми до push,
после подтверждённой публикации B проверяет Update без forced reload и сохранение
синтетического черновика. Это Chrome Service Worker, не физический iPhone.

На iPhone после появления Update нажать его один раз. Проверить «Словари» и
Inbox; включить авиарежим, выполнить чтение/обновление списка, затем выключить
авиарежим и вернуться в приложение. Последний список должен сохраняться, ошибка
— исчезнуть после успешного чтения. Повторить после background/foreground и
проверить сохранность черновика. Не проверять восстановление сети удалением или
созданием пользовательских словарей. При неопределённом результате изменения
сначала проверить список, а не повторять операцию вслепую.

### Подтверждённая публикация CP-005 — 2026-10-31 12:31 МСК

Commit/tag cp-005 `ccf32852bc0bcf712a2c80d5dd1d0d1ded652ee3`, push успешен.
Оба сайта опубликованы на release `7bed10ba4dba9d64a448`; 17 файлов каждого
совпали с Git артефактами. CF Pages deployment
`dc45f21f-ab44-401f-b6e1-ef0a91af29d2`. Worker deployment сохранён:
`8f169044-f2dc-47c0-9d46-b2dc42b62d13`, source/bindings проверены read-only.

На обоих опубликованных сайтах Chrome подтвердил network-error recovery и
сохранение последнего списка, отсутствие token в diagnostics и ноль write
requests. Отдельно обе заранее открытые A-сессии получили Update после push;
нажатие активировало B и сохранило синтетический черновик. Runtime после
checkpoint не исправлялся: уточнено только ожидание initial reads в ops-тесте.
Полные receipts и ограничения сохранены в CHECKPOINTS.md. D1/секреты не менялись.
