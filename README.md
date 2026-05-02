Anki_Bot — Документация

Коротко: Google Apps Script (GAS) Telegram‑бот принимает ввод пользователя, вызывает OpenAI для генерации карточки в строгом JSON‑формате, показывает предпросмотр в боте, позволяет править черновик и сохраняет карточки в Google Sheets для последующего экспорта в Anki.

**Компоненты**
- `Код.js` / GAS — основной скрипт, развернутый как Web App и принимает webhook от Telegram.
- `Archive.js` — копия/резервный вариант скрипта (локальная копия). Можно хранить как бэкап, см. раздел «Archive.js».
- Google Sheet — база карточек (ID и имя листа описаны в `database_schema.md`).
- OpenAI API — генерация карточек по жёсткому system prompt (schema + temperature=0).

**Ключевые принципы**
- Строгий JSON‑schema для ответа модели (поле `hints` — массив из 7 строк и т.п.).
- Temperature = 0, retries/валидация результатов обязательна.
- Секреты (TELEGRAM_TOKEN, OPENAI_API_KEY, SHEET_ID, SHEET_NAME) должны храниться в PropertiesService (или Secret Manager). Никогда не хранить в репозитории.

Что обычно описывать в README (и что я включил): архитектура, требуемые переменные/секреты, шаги деплоя, проверка/валидация, рекомендации по безопасности, экспорт в Anki, часто возникающие ошибки и контакты/следующие шаги.

Настройка (GAS + Telegram)
1. Создайте проект Google Apps Script, вставьте код (`Код.js`) и откройте `Editor`.
2. Переменные окружения (Script Properties):
   - Откройте `Project Settings -> Script Properties` и добавьте: `TELEGRAM_TOKEN`, `OPENAI_API_KEY`, `SHEET_ID`, `SHEET_NAME`.

3. Деплой web app: `Deploy -> New deployment -> Web app`.
   - `Execute as`: `USER_DEPLOYING` (или нужный аккаунт)
   - `Who has access`: `Anyone` (или ограничьте через Telegram secret token)

4. Настройте Telegram webhook (замените <WEBAPP_URL> и <TELEGRAM_TOKEN>):

```
curl -s -X POST "https://api.telegram.org/bot<TELEGRAM_TOKEN>/setWebhook" -d url="<WEBAPP_URL>" -d secret_token="YOUR_SECRET"
```

Рекомендации по безопасности и надёжности
- Всю логику чувствительных данных держать в `PropertiesService.getScriptProperties()`:
  - В коде читать `const TELEGRAM_TOKEN = PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN');`
- Ограничьте webhook с помощью `secret_token` и проверяйте заголовок в запросах.
- Добавьте валидацию ответа модели (schema + enum checks + length checks) до использования и до записи в Sheet.
- Логирование ошибок и ответов (без секретов) — используйте `Logger.log` и/или отдельный лист для ошибок.
- Используйте короткие `draftId` или UUID в `callback_data`, не храните там длинный текст.

Архив/`Archive.js`
- `Archive.js` — локальная копия скрипта. Совет: хранить копию для истории/бэкапа, но удалить/замаскировать в ней любые секреты перед добавлением в репозиторий.
- Если вы не ведёте git пока — можно оставить `Archive.js` как резерв. Когда подключите репозиторий, добавьте `.gitignore` для файлов с секретами или заранее удалите их.

Как я читаю/анализирую GAS-скрипт
- Я работаю с файлами в рабочей папке (локальные копии `Код.js`, `Archive.js` и т.д.) через файловую систему репозитория — читаю их как обычные файлы.
- Если нужно синхронизироваться с live‑GAS, рекомендую `clasp` (Google‑maintained tool):

```
npm install -g @google/clasp
clasp login
clasp clone <scriptId>   # получить код из Apps Script проекта
clasp pull               # синхронизировать локально
clasp push               # запушить изменения обратно в GAS
```

Альтернативно можно использовать Apps Script API для загрузки/выгрузки кода.

Экспорт в Anki
- Текущий рабочий флоу — экспорт в CSV (выделяете типы карт по отдельности). Для автоматизации можно создать отдельный экспортный скрипт (например, Node/Python) который берёт строки из Sheet и конвертирует в `apkg` через `genanki` или через `AnkiConnect`.

Частые проблемы и решения
- Модель возвращает неверный enum → отклонять и перегенерировать с уточняющим prompt.
- `callback_data` превышает лимит → хранить mapping id→payload в CacheService.
- Секреты в коде → вынести в Properties и отозвать старые ключи.

Следующие шаги (вариантно, могу сделать за вас)
- Проверить и удалить/замаскировать секреты в `Archive.js` и `Код.js` (если остались) — могу подготовить патч.
- Внедрить mapping draftId → payload (замена длинных callback_data) — могу подготовить изменения в коде.
- Добавить серверную валидацию JSON ответов модели — могу добавить пример кода в GAS.

Проект реорганизован: подробная документация и политики теперь в `docs/`.

Ключовые файлы:
- `docs/ARCHITECTURE.md` — архитектура и деплой
- `docs/SECURITY.md` — политика безопасности
- `docs/AGENT.md` — инструкции для агента

Если нужно — выполню дополнительные правки (pre-commit hook, PR с изменениями, перенос `Archive.js`).
