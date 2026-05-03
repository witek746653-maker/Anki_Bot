Инструкции для агента

Краткое описание проекта и правила работы агента находятся в `docs/ARCHITECTURE.md` и `docs/SECURITY.md`.

Кратко:
- Перед любыми изменениями — подготовить план и PR, не пушить напрямую в `main`.
- Никогда не вставлять секреты в код; использовать `PropertiesService` для GAS.
- Любые изменения, затрагивающие `docs/DATABASE_SCHEMA.md`, `Код.js`, `scripts/deploy.js` или `appsscript.json` — оформлять отдельным PR с миграцией и тестами.
- Добавлять валидацию JSON от модели (schema + enum checks) перед записью в Sheet.

Файлы поддержки агента:
- `.agents/safe_mode.md` — runtime policy, обязательная проверка перед изменениями.
- `.agents/cursorrules` — критическое правило: читать `docs/DATABASE_SCHEMA.md` и `.agents/safe_mode.md` перед записью в `Код.js`.
