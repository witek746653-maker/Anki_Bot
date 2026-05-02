Anki_Bot — Документация (архитектура)

Коротко: Google Apps Script (GAS) Telegram‑бот принимает ввод пользователя, вызывает OpenAI для генерации карточки в строгом JSON‑формате, показывает предпросмотр в боте, позволяет править черновик и сохраняет карточки в Google Sheets для последующего экспорта в Anki.

Компоненты
- `Код.js` — основной GAS-скрипт (обработка webhook, генерация JSON от модели, сохранение в Google Sheets).
- `backups/Archive.js` — резервная копия/история (локальная копия, без секретов).
- Google Sheet — база карточек (ID и имя листа описаны в `docs/DATABASE_SCHEMA.md`).
- OpenAI API — генерация карточек по жёсткому system prompt (schema + temperature=0).

Деплой
- Локально: `npm install` (при необходимости), `npm run deploy` — вызывает `scripts/deploy.js` (использует `clasp`).
- GAS: `clasp login` / `clasp push` / `clasp deploy`.

Безопасность
- Секреты (TELEGRAM_TOKEN, OPENAI_API_KEY, SHEET_ID, SHEET_NAME) должны храниться в `PropertiesService.getScriptProperties()` и не должны находиться в репозитории.

Ссылки
- Схема БД: `docs/DATABASE_SCHEMA.md`
- Политика безопасности и правила агента: `docs/SECURITY.md`, `docs/AGENT.md`
