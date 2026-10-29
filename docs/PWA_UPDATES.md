# Обновления LEXICON

## Образец MyMate

Изучены файлы `mymatevessel/mymate-vessel` на GitHub:

- [PwaUpdates.tsx](https://github.com/mymatevessel/mymate-vessel/blob/main/app/src/PwaUpdates.tsx), blob `7dd3638967fed490ff1d07a158927311b722b9cd`;
- [pwa-updates.css](https://github.com/mymatevessel/mymate-vessel/blob/main/app/src/pwa-updates.css), blob `22ff1375f25a3e4841d631235345b3aa0a2385e2`;
- [vite.config.ts](https://github.com/mymatevessel/mymate-vessel/blob/main/app/vite.config.ts), blob `ff3dcf4015eabc758208f4e2c1976ea504a26a4e`;
- [main.tsx](https://github.com/mymatevessel/mymate-vessel/blob/main/app/src/main.tsx), blob `8e8b4c4856d03bb571a4cc89466f5dbe00449514`.

Перенесён реализованный принцип: prompt, waiting worker, действие пользователя,
однократный reload после активации, foreground-проверки без параллельных запросов,
ошибка с повтором и компактная панель с 44px кнопкой. React/Vite и Workbox не добавлены.

## Поведение

`pwa-updates.js` регистрирует SW с `updateViaCache: none`, проверяет при запуске,
visibilitychange (только visible), pageshow и online. Постоянного polling нет.
Update появляется при waiting SW либо когда другая вкладка уже активировала
release ID, отличный от открытой страницы. Первая установка кнопку не показывает.
Изменения backend не участвуют в fingerprint frontend.

Нажатие сохраняет текстовые черновики, готовые результаты и состояние панелей в
sessionStorage текущей вкладки. Затем SKIP_WAITING активирует версию; controllerchange
перезагружает только нажавшую вкладку. Другие вкладки предлагают собственный Update.
После восстановления снимок удаляется. localStorage, словари и токен не очищаются.

Ошибка хранилища отменяет активацию. Таймаут 15 секунд даёт повторить Update.
Запись, сетевые операции, файлы, редакторы, документ/ИИ и неизвестные несохранённые
поля блокируют обновление с объяснением: сначала закончить/сохранить работу.
Эти состояния не обещаются как автоматически восстанавливаемые.

## Версия и кэш

`npm run build:frontend` создаёт release ID по публичным frontend-файлам и шаблону
SW. `sw.js` и `frontend-release.js` сохраняются в том же коммите. Backend/docs
не меняют ID. `npm run check:frontend` отклоняет устаревшие generated-файлы.
`.gitattributes` фиксирует LF; импортированный backend сохраняется побайтно.

При install каждый публичный asset загружается без HTTP-кэша и credentials и
проверяется SHA-256. Только полный согласованный набор становится ready update;
повреждённый/неполный выпуск отклоняется, foreground повторяет проверку.
Активный SW отдаёт свой цельный HTML/JS/CSS из кэша, включая офлайн-навигацию.

Allowlist содержит только публичные app-shell файлы. API, cross-origin, POST,
Authorization/Range и query-варианты assets не кэшируются и не обслуживаются из
кэша. Navigation с query получает тот же публичный HTML, не пользовательский ответ.
Удаляются только старые кэши LEXICON, включая legacy lexicon-pdf-ui; чужие сохраняются.

## Воспроизводимые проверки

Из корня: `npm ci`, `npm run build:frontend`, `npm run check:frontend`, `npm run test:pwa`.
Playwright в devDependencies; используется установленный Chrome. Другой браузерный
канал задаётся `LEXICON_TEST_BROWSER`; при отсутствии браузера его нужно установить
отдельно. Внешние API заменены фикстурами; тесты не обращаются к production backend.

Тест публикует A/B/C в памяти через localhost под `/lexicon/`, использует настоящие
регистрацию, install, waiting, активацию SW и загрузку страниц. Проверяет данные,
две вкладки, ошибки, offline и ограничения кэша. Ширины 390/393/430 проверены.
Mobile standalone — эмуляция; физический iPhone и реальная установка не подтверждены.

## Проверка на iPhone

1. Открыть `https://timashevanatoly10-blip.github.io/lexicon/` в Safari и при желании
   добавить на экран «Домой». При первом переходе со старого frontend один раз
   закрыть старые окна/вкладки LEXICON и открыть заново: старый JS ещё не содержит Update.
2. В версии с новым механизмом ввести текст. Если следующего frontend-релиза нет,
   кнопка появляться не должна.
3. После следующей отдельно согласованной frontend-публикации уйти в другое
   приложение и вернуться либо восстановить интернет. Дождаться Update после
   загрузки и проверки версии. Ручной Refresh не нужен.
4. Нажать Update: интерфейс перезапускается, текст и готовые результаты остаются,
   кнопка исчезает. При записи/файле/редакторе показывается объяснение; при ошибке
   доступен повтор. Повторить отдельно в Safari и приложении с экрана «Домой».

Первый выпуск не может ретроактивно изменить уже исполняющийся legacy JS. Полный
production A → B после внедрения требует следующего согласованного frontend-релиза;
в CP-001 он подтверждён локальным HTTP-тестом. CP-002 автоматически не начинается.
