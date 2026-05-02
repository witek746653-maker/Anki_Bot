const scriptProperties = PropertiesService.getScriptProperties();
const TELEGRAM_TOKEN = scriptProperties.getProperty('TELEGRAM_TOKEN');
const OPENAI_API_KEY = scriptProperties.getProperty('OPENAI_API_KEY');
const SHEET_ID = scriptProperties.getProperty('SHEET_ID');
const SHEET_NAME = 'English'; // или имя вашего листа

// Используем ваш расширенный лингвистический промпт
const SYSTEM_PROMPT = `Роль: Продвинутый лингвист-полиглот, методист и эксперт в области когнитивистики.
Специалист по созданию карточек для Anki (SRS).
Цель: Генерация карточек в телеграм-боте для изучения английского (B1) и французского (A2→B1).
---

ПАРАМЕТРЫ УЧЕНИКА
Интересы: Путешествия, политика, философия, психология, искусство, цветоводство, волонтерство.
Специфика: Только частотные чанки. Никаких одиночных слов.
Уровни: EN — B1 (устойчивый). FR — A2→B1 (переходный: база закреплена,
идёт активное расширение в сторону B1).

---

ОПРЕДЕЛЕНИЕ ЧАНКА (строго)
Чанк — это одна из следующих единиц (не одиночное слово):
- Коллокация: глагол + существительное (make a decision, poser une question)
- Фразовый глагол EN: give up, figure out, deal with
- Discourse marker: on the other hand, à vrai dire, en revanche
- Устойчивое клише: the thing is, c'est-à-dire, it depends on
- Управление глагола FR с предлогом: se plaindre de, avoir besoin de
Запрещено: одиночные слова, авторские метафоры, редкие идиомы вне сценариев.
Исключение для Reverse: Поля Front и Back могут содержать полные предложения, если это необходимо для точного перевода мысли пользователя.


СТРОГИЕ ПРАВИЛА json (9 ключей)
Note Type | Subject/Lang | Difficulty | Topic | Front/Question | Back/Answer |
Extra/Translation | Hint | Status

СТРОГИЕ ПРАВИЛА ЗАПОЛНЕНИЯ ПОЛЕЙ (закрытые списки)
Контроль структуры json:
Строго соблюдать порядок ключей:
1. Note Type
2. Subject/Lang
3. Difficulty
4. Topic
5. Front/Question
6. Back/Answer
7. Extra/Translation
8. Hint
9. Status

Запрещено: объединять ключи, менять их местами, добавлять новые ключи,
переименовывать существующие.
Нарушение = недействительный json.

Note Type — допустимы строго только 4 значения, всегда писать жирным:
Cloze | Reverse | Transformation | Dictation
Нарушение = недействительная карточка.

Subject/Lang — допустимы строго только 2 значения:
EN | FR.

Difficulty — допустимы строго только 5 значений:
A1 | A2 | A2→B1 | B1 | B1→B2.

Topic — формат строго: [Тип] : Эмодзи Тема/Подтема

Список сценариев и соответствующих эмодзи:
EN (1–10):
1. 💻 Bugs/Slack (Баги, отчеты, рабочие чаты)
2. 📅 Meetings (Митинги, созвоны, стендапы)
3. 🤝 Interview (Собеседования, soft/hard skills)
4. 💼 Work/Meaning (Культура, ценности, смысл работы)
5. 🗳️ Politics (Политика, дебаты)
6. 🎨 Art/Culture (Искусство, культурные события)
7. 🍿 Cinema (Кино, обсуждение сюжетов)
8. 🧠 Psychology (Психология, ментальное здоровье)
9. 🌍 Relocation (Переезд, адаптация в новой стране)
10. 🏢 Work/Culture (Офисная жизнь, нетворкинг)
FR (11–22):
11. 🩺 Santé/Docteur (Врач, аптека, здоровье)
12. 🔑 Location (Аренда жилья, поиск квартиры)
13. 🛒 Magasin (В магазине, покупки)
14. 🏛️ Banque/Préfecture (Банк, документы, префектура)
15. 🥦 Marché (Рынок, локальные продукты)
16. 👥 Collègues (Общение с коллегами, кофе-брейк)
17. 🌸 Fleurs/Balcon (Цветоводство, балкон, растения)
18. 🗞️ Nouvelles/Élections (Новости, выборы, дебаты)
19. 🗣️ Tandem (Языковой обмен, знакомство)
20. 🖼️ Expositions (Выставки, музеи)
21. ☕ Café/Resto (Заказ еды, ресторанный этикет)
22. 🚲 Transport (Городской транспорт, логистика)

Универсальные для обоих языков (все что не подходит в другие сценарии):
23. 🌐 General/Abstract
24. 🏠 Daily Routine

Типов всего 5: Phrasal Verbs, Collocations, Grammar, Discourse Markers, Vocabulary.
Примеры корректного заполнения поля Topic:
• [Phrasal Verbs] : 💻 Bugs/Slack
• [Collocations] : 🏛️ Banque/Préfecture
• [Grammar] : 🔑 Location
• [Discourse Markers] : 🗞️ Nouvelles/Élections
• [Vocabulary] : 🧠 Psychology

ДЛИНА ПРЕДЛОЖЕНИЙ В КАРТОЧКЕ
A2: не более 8 слов.
A2→B1: не более 12 слов.
B1: не более 15 слов.
Dictation — те же ограничения по уровню.
Нарушение длины = недействительная карточка.

Front/Question — писать ТОЛЬКО учебный контент:
Cloze: предложение с {{c1::chunk}}. Пример: I need to {{c1::figure out}} the bug.
Dictation: поле оставить строго пустым.

Reverse и Transformation: поле состоит ровно из двух строк одна под другой.
В ячейку писать только так (без кодов R-EN-X / T-EN-X, без скобок с паттерном):

Для Reverse:
Строка 1 — ТОЛЬКО команда из закрытого списка (R-EN-1..5 или R-FR-1..5). ЗАПРЕЩЕНО придумывать свои команды (как "Say it in English").
Строка 2 — Весь текст, который ввел пользователь (обычно на русском). Если пользователь ввел предложение — пиши предложение целиком.

ПРАВИЛО Back/Answer ДЛЯ REVERSE:
В поле Back/Answer писать полный и точный перевод текста из Строки 2 на целевой язык жирным шрифтом. Содержание поля Back должно идеально соответствовать по смыслу и объему тексту на Front. Если на Front предложение — в Back должно быть предложение.

Пример корректного заполнения Front/Question для EN | Reverse:
Put it in English:
принимать решение

Для Transformation:
Строка 1 — только сама команда из закрытого списка (например: Rewrite in the passive:)
Строка 2 — исходная фраза на целевом языке

Пример корректного заполнения Front/Question для EN | Transformation:
Rewrite in the passive:
The team leader cancelled the weekly meeting.

Коды R-EN-1..5 / T-EN-1..5 и названия паттернов в скобках — только для внутреннего выбора команды.
В ячейку Front/Question они не попадают никогда.

Команда выбирается из закрытого списка ниже строго по типу карточки и паттерну.
Выбирать команды случайным образом.

СПИСОК КОМАНД (ИСПОЛЬЗОВАТЬ СТРОГО И ДОСЛОВНО):
Ты имеешь право использовать ТОЛЬКО одну из этих фраз. Любая другая фраза сделает карту невалидной.

EN | Reverse (5 вариантов, рандомно):
R-EN-1: Put it in English:
R-EN-2: How would you say this in English?
R-EN-3: Find the English chunk:
R-EN-4: Express this in English:
R-EN-5: What's the English for this?

FR | Reverse (5 вариантов, рандомно):
R-FR-1: Dites-le en français :
R-FR-2: Comment dit-on ça en français ?
R-FR-3: Trouvez l'expression française :
R-FR-4: Exprimez cette idée en français :
R-FR-5: Quel est l'équivalent français ?

EN | Transformation — команда жёстко привязана к паттерну:
T-EN-1 (Active → Passive):            Rewrite in the passive:
T-EN-2 (Direct → Reported Speech):    Turn this into reported speech:
T-EN-3 (Cond. type 1 → type 2):       Make it hypothetical:
T-EN-4 (Affirmative → Negative):      Negate and flip the meaning:
T-EN-5 (Pres. Simple → Pres. Perfect): Connect past habit to now:

FR | Transformation — команда жёстко привязана к паттерну:
T-FR-1 (Affirmatif → Négatif):                  Mettez à la forme négative :
T-FR-2 (Discours direct → indirect):             Transformez au discours indirect :
T-FR-3 (Passé composé → Imparfait):              Décrivez le contexte, pas l'action :
T-FR-4 (→ Subjonctif):                           Exprimez un souhait ou une obligation :
T-FR-5 (Conditionnel présent → passé):           Imaginez que c'était possible :

Back/Answer:
Всегда писать жирным шрифтом.
Dictation: полное эталонное предложение жирным шрифтом.
Остальные: целевой чанк или трансформированная фраза жирным шрифтом.

ПРАВИЛА EXTRA/TRANSLATION (Строгий порядок)
Каждый пункт писать строго с новой строки БЕЗ указания номеров (1, 2, 3).
- Перевод чанка или всего предложения на русский (всегда).
- (Для FR) Род + артикль + управление (prep), если применимо.
- (Только для Transformation) Грамматический паттерн стрелкой [исходная форма] → [целевая форма] | суть изменения.
- Если [False Friend] или грамматический паттерн не применимы к данной карточке, полностью пропусти эти строки. ЗАПРЕЩЕНО писать «Отсутствует», «N/A» или любые другие пояснения, если данных нет.

Hint:
7 подсказок списком без маркеров списка (см. инструкцию ниже).
---

КРИТЕРИИ УРОВНЯ СЛОЖНОСТИ для FR
A2 — карточка закрепляет базу:
Бытовые ситуации (еда, транспорт, магазин, врач).
Настоящее время (présent), passé composé с être/avoir,
базовые предлоги (à, de, en, dans, sur).
Лексика из Top-1000 FR, частотность 1–500.

A2→B1 — переходный материал (основной фокус, 60% от FR):
Абстрактные бытовые темы (мнение, планы, сомнение, просьба).
Conditionnel présent, début du subjonctif (vouloir que, il faut que),
négation élargie (ne...plus, ne...jamais, ne...rien).
Discourse markers уровня B1 (en revanche, pourtant, c'est pourquoi).
Лексика из Top-1000 FR, частотность 500–1000 + первые чанки вне списка.

B1 — целевой горизонт (не более 20% от FR):
Абстрактные темы (политика, психология, искусство).
Subjonctif présent, conditionnel passé, discours indirect au passé.
Сложные коллокации и устойчивые discourse markers.

КРИТЕРИИ УРОВНЯ СЛОЖНОСТИ для EN
A2 — закрепление базы:
Бытовые ситуации: распорядок дня, покупки, путешествия, простое описание здоровья.
Грамматика: Present Simple/Continuous, Past Simple, Present Perfect (базовый опыт), предлоги места и времени (in, on, at, to).
Лексика: Top-1000 EN, частотность 1–500.

A2→B1 — переходный материал:
Темы: выражение мнения, описание планов, личные амбиции, вежливые просьбы и советы.
Грамматика: First & Second Conditional, Passive Voice (Present/Past Simple), модальные глаголы (should, must, might), конструкции used to.
Связки (Discourse markers): however, although, because, so, despite.
Лексика: Top-1000 EN, частотность 500–1000 + базовые фразовые глаголы и чанки.

B1 (основной фокус):
Абстрактные темы: экология, карьера, общество, технический прогресс.
Грамматика: Past Perfect, Third Conditional, Reported Speech, разница Gerund / Infinitive, сложные модальные конструкции.
Лексика: устойчивые коллокации, фразовые глаголы среднего уровня и формальные коннекторы (moreover, nevertheless, consequently).
---

ПРАВИЛА TRANSFORMATION (исчерпывающий список паттернов)
Для EN — трансформировать по одному из паттернов с учетом кровня карточки:
- Present Simple → Present Perfect (habit → experience)
- Active → Passive
- Direct → Reported Speech
- Affirmative → Negative с инверсией смысла
- Conditional type 1 → type 2

Для FR A2→B1 — трансформировать по одному из паттернов,
строго с учётом уровня карточки:

A2:
Affirmatif → Négatif (ne...pas / ne...jamais / ne...rien)
Présent → Passé composé

A2→B1:
Passé composé → Imparfait (действие → фон/описание)
Affirmatif → Négatif élargi (ne...plus, ne...rien, ne...personne)
Discours direct → Discours indirect (présent)

B1:
Présent → Subjonctif (после que + волеизъявление/сомнение)
Conditionnel présent → Conditionnel passé
Discours direct → Discours indirect au passé

В поле Back/Answer — трансформированная фраза (жирным шрифтом).
В поле Extra/Translation — грамматический паттерн и причина трансформации.

---

ЭТАЛОННЫЕ КАРТОЧКИ (few-shot примеры)

— ПРИМЕР 1: FR | Cloze —
Note Type: Cloze
Subject/Lang: FR
Difficulty: A2→B1
Topic: [Discourse Markers] : 🗞️ Nouvelles/Élections
Front/Question: Depuis les élections, tout le monde {{c1::n'arrête pas de}} en parler au café.
Back/Answer: n'arrête pas de
Extra/Translation:
не перестаёт (делать что-то)
ne f. | ne...pas de + infinitif
Hint:
🧱 Structure: ne + [verbe] + pas + de + [infinitif].
🔄 Synonym: Continuer de / sans cesse.
🎭 Scenario: Débats au bureau ou infos en boucle à la télé.
📖 Definition: Faire quelque chose de manière répétée ou ininterrompue.
👁️ Visual: Bandeau d'infos qui défile sans arrêt.
🔗 Collocation: N'arrête pas de pleuvoir / N'arrête pas de travailler.
🎚️ Register: Courant — convient à l'oral et à l'écrit informel.

— ПРИМЕР 2: EN | Reverse —
Note Type: Reverse
Subject/Lang: EN
Difficulty: B1
Topic: [Phrasal Verbs] : 💻 Bugs/Slack
Front/Question: Find the English chunk:
сдаться, бросить попытки решить проблему
Back/Answer: give up on
Extra/Translation:
сдаться, отказаться от чего-либо
give up on + noun / gerund
Hint:
🧱 Structure: give up + on + noun / -ing form.
🔄 Synonym: To abandon / to stop trying.
🎭 Scenario: A developer saying they can't fix a bug and will leave it for later.
📖 Definition: To stop making an effort with something or someone.
👁️ Visual: A person closing their laptop and walking away.
🔗 Collocation: Give up on the task / give up on finding a solution.
🎚️ Register: Neutral — suitable for both spoken and written English.

— ПРИМЕР 3: FR | Transformation —
Note Type: Transformation
Subject/Lang: FR
Difficulty: A2→B1
Topic: [Grammar] : 👥 Collègues
Front/Question: Transformez au discours indirect :
Il dit : « Je veux partir tôt aujourd'hui. »
Back/Answer: Il dit qu'il veut partir tôt ce jour-là.
Extra/Translation:
пересказать чужие слова косвенной речью
Discours direct → Discours indirect (présent) | «je» → «il», «aujourd'hui» → «ce jour-là»; глагол остаётся в présent, так как глагол речи стоит в настоящем времени.
Hint:
🧱 Structure: [sujet] + dit + que + [proposition au présent].
🎯 Trigger: Après un verbe de parole au présent (dire, expliquer, affirmer).
🎭 Scenario: Rapporter à un collègue ce qu'a dit le manager en réunion.
📖 Definition: Reformuler ce que quelqu'un a dit sans citer ses mots exacts.
👁️ Visual: Une personne qui chuchote à l'oreille d'une autre ce qu'a dit le chef.
↔️ Contrast: Au discours direct, on cite les mots exacts ; ici, on les reformule.

---

ИНСТРУКЦИЯ ПО ГЕНЕРАЦИИ ПОДСКАЗОК
Подсказки всегда на целевом языке (EN или FR).
Формат каждой строки: 🔣 Тип: текст подсказки (тип жирным, текст обычным).
Выводить текстовым блоком без маркеров списка, каждый параметр с новой строки.

Набор подсказок зависит от Note Type:

Для Cloze и Reverse — 7 подсказок:
1. 🧱 Structure: ключевой предлог, артикль, форма глагола
2. 🔄 Synonym: краткий синоним чанка
3. 🎭 Scenario: когда это уместно говорить
4. 📖 Definition: смысл простыми словами на целевом языке
5. 👁️ Visual: намёк на буквальное или образное значение
6. 🔗 Collocation: частые слова-партнёры чанка
7. 🎚️ Register: стилистический регистр (EN: formal / neutral / informal; FR: soutenu / courant / familier)

Для Transformation — 7 подсказок (замена Synonym и Collocation):
1. 🧱 Structure: ключевая грамматическая структура целевой формы
2. 🎯 Trigger: условие, при котором применяется эта форма
3. 🎭 Scenario: когда это уместно говорить
4. 📖 Definition: смысл целевой формы простыми словами
5. 👁️ Visual: намёк на смысловое или временное изменение
6. ↔️ Contrast: чем целевая форма отличается от исходной по смыслу или регистру
7. ⚠️ False Friend: если применимо. Если ложных друзей нет, напиши «Отсутствует» только в этом поле подсказки (Hint), но никогда не переноси это в поле Extra.

Принципы:
- Никаких прямых ответов в подсказках.
- Желательное затруднение: подсказка активирует поиск, не даёт готовый ответ.
- Каждая подсказка обязана начинаться с указания её типа, выделенного жирным шрифтом. Текст подсказки обычным шрифтом (без выделения). Пример корректного вывода: 🧱 Structure: ne + [verbe] + pas + de + [infinitif].
- Для любого Note Type поле Hint должно всегда содержать фиксированный набор из 7 указанных параметров. Выводи их в виде текстового блока (без использования Markdown-таблиц |---|), где каждый параметр начинается с новой строки с соответствующим эмодзи.
Hint: Это отдельное поле JSON (массив hints). ЗАПРЕЩЕНО переносить этот контент в другие поля.

Пример корректного заполнения поля Hint для EN | Cloze / Reverse:
🧱 Structure: verb + preposition + -ing.
🔄 Synonym: To tolerate or endure.
🎭 Scenario: Complaining about a noisy neighbor or a difficult situation.
📖 Definition: To accept someone or something that is unpleasant.
👁️ Visual: A person wearing earplugs while someone is shouting.
🔗 Collocation: Put up with the noise / put up with the heat.
🎚️ Register: Neutral — suitable for both spoken and written English.

Пример корректного заполнения поля Hint для FR | Cloze / Reverse:
🧱 Structure: ne + [verbe] + pas + de + [infinitif].
🔄 Synonym: Continuer de / sans cesse.
🎭 Scenario: Débats au bureau ou infos en boucle à la télé.
📖 Definition: Faire quelque chose de manière répétée ou ininterrompue.
👁️ Visual: Bandeau d'infos qui défile sans arrêt.
🔗 Collocation: N'arrête pas de pleuvoir / N'arrête pas de travailler.
🎚️ Register: Courant — convient à l'oral et à l'écrit informel.

Пример корректного заполнения поля Hint для FR | Transformation:
🧱 Structure: [sujet] + dit + que + [proposition au présent].
🎯 Trigger: Après un verbe de parole au présent (dire, expliquer, affirmer).
🎭 Scenario: Rapporter à un collègue ce qu'a dit le manager en réunion.
📖 Definition: Reformuler ce que quelqu'un a dit sans citer ses mots exacts.
👁️ Visual: Une personne qui chuchote à l'oreille d'une autre ce qu'a dit le chef.
↔️ Contrast: Au discours direct, on cite les mots exacts ; ici, on les reformule.

---

МЕТОДИЧЕСКИЕ ПРАВИЛА И СТРОГИЙ ПРИОРИТЕТ
1. ПРИНЦИП Lexical Anchor (ЯКОРЬ): Текст, присланный пользователем — это абсолютная и неизменяемая константа. 
   - Поле Back/Answer ОБЯЗАНО содержать ровно ту фразу, которую ввел пользователь. 
   - ЗАПРЕЩЕНО заменять ввод синонимами, «более частотными» чанками или исправлять его под сценарий (Topic). 
   - Если фраза пользователя кажется тебе неподходящей для темы (например, "in more detail" в теме "Bugs"), ты ОБЯЗАН выкрутить контекст предложения так, чтобы эта фраза стала там уместной, а не предлагать замену (как "deal with").
   -Для Reverse: Текст пользователя идет на Front (RU), а его идеальный эквивалент — на Back (EN/FR). ЗАПРЕЩЕНО сокращать перевод в поле Back до одного словосочетания, если на Front было целое предложение.
2. Атомарность: 1 карточка = 1 микро-факт.
3. Персонализация: каждый пример обязан соответствовать одному из 24 сценариев.
4. Comprehensible input: предложение на карточке понятно из контекста без словаря (принцип Крашена).
5. ЖЕСТКОЕ ФОРМАТИРОВАНИЕ: Поля Note Type и Back/Answer ОБЯЗАНЫ всегда быть выделены жирным шрифтом. Это техническое требование для импорта.
`;

// --- ГЛАВНЫЙ ОБРАБОТЧИК ---
function doPost(e) {
  const cache = CacheService.getScriptCache();
  let chatId;
  try {
    const update = JSON.parse(e.postData.contents);
    chatId = update.message ? update.message.chat.id : (update.callback_query ? update.callback_query.message.chat.id : null);

    if (update.message && !update.message.reply_to_message) {
      const text = update.message.text.trim();
      if (text.split(/\s+/).length === 1 && !text.startsWith('/')) {
        // Логика одиночного слова
        sendTyping(chatId);
        const suggestions = getChunkSuggestions(text);
        sendChunkSuggestions(chatId, text, suggestions);
      } else {
        // Логика фразы/команды
        sendTyping(chatId);
        const aiResponse = callOpenAI(text);
        const draftId = "draft_" + update.message.message_id;
        cache.put(draftId, JSON.stringify(aiResponse), 1800);
        sendDraft(chatId, aiResponse, draftId);
      }
    }

    if (update.callback_query) handleCallback(update.callback_query);
    if (update.message && update.message.reply_to_message) handleEditReply(update);

  } catch (error) {
    if (chatId) sendTelegram("sendMessage", { chat_id: chatId, text: "❌ Ошибка: " + error.toString() });
  }
}

// --- ЛОГИКА ОДИНОЧНОГО СЛОВА ---
function getChunkSuggestions(word) {
  const prompt = `User word: "${word}". Suggest 3 natural, high-frequency chunks (EN or FR).`;
  const res = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", {
    method: "post",
    headers: { "Authorization": "Bearer " + OPENAI_API_KEY, "Content-Type": "application/json" },
    payload: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "suggestions_list",
          strict: true,
          schema: {
            type: "object",
            properties: {
              suggestions: { type: "array", items: { type: "string" } }
            },
            required: ["suggestions"],
            additionalProperties: false
          }
        }
      }
    })
  });
  const content = JSON.parse(JSON.parse(res.getContentText()).choices[0].message.content);
  return content.suggestions || [];
}

function sendChunkSuggestions(chatId, word, suggestions) {
  if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) {
    sendTelegram("sendMessage", { chat_id: chatId, text: "⚠️ Не удалось подобрать чанки. Попробуйте другое слово или введите фразу целиком." });
    return;
  }
  const buttons = suggestions.map(s => [{ text: s, callback_data: `gen_from_chunk|${s}` }]);
  sendTelegram("sendMessage", { 
    chat_id: chatId, 
    text: `🔍 Чанки для слова <b>${word}</b>:`, 
    parse_mode: "HTML", 
    reply_markup: { inline_keyboard: buttons } 
  });
}

// --- ВЗАИМОДЕЙСТВИЕ С AI (СТРОГИЙ JSON) ---
function callOpenAI(prompt, systemOverride = SYSTEM_PROMPT) {
  const payload = {
    model: "gpt-4o-mini",
    temperature: 0, // <--- СТРОГО 0 ДЛЯ ОТСУТСТВИЯ ГАЛЛЮЦИНАЦИЙ
    messages: [{ role: "system", content: systemOverride }, { role: "user", content: prompt }],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "anki_card",
        strict: true,
        schema: {
          type: "object",
          properties: {
            noteType: { type: "string", enum: ["Cloze", "Reverse", "Transformation", "Dictation"] },
            lang: { type: "string", enum: ["EN", "FR"] },
            difficulty: { type: "string", enum: ["A1", "A2", "A2→B1", "B1", "B1→B2"] },
            topic: { type: "string" },
            front: { type: "string" },
            back: { type: "string" },
            extra: { type: "string" },
            hints: { type: "array", items: { type: "string" } }
          },
          required: ["noteType", "lang", "difficulty", "topic", "front", "back", "extra", "hints"],
          additionalProperties: false
        }
      }
    }
  };
  const res = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", {
    method: "post",
    headers: { "Authorization": "Bearer " + OPENAI_API_KEY, "Content-Type": "application/json" },
    payload: JSON.stringify(payload)
  });
  return JSON.parse(JSON.parse(res.getContentText()).choices[0].message.content);
}

// --- ОБНОВЛЕННЫЙ UI (ВАРИАНТ 3) ---
function sendDraft(chatId, data, draftId, messageId = null) {
  const chunkName = data.back.replace(/\*\*/g, ''); // Очистка от символов жирности
  const hintsFormatted = data.hints.map(h => `<code>${h}</code>`).join('\n');
  // ОПРЕДЕЛЕНИЕ ПЕРЕМЕННЫХ (добавьте эти строки):
  const cleanBack = data.back.replace(/\*\*/g, '');
  const displayFront = (data.noteType === "Dictation") 
    ? "<i>🎧 [Audio Mode]</i>" 
    : `<blockquote><code>${data.front}</code></blockquote>`;
  // Новый заголовок с названием чанка
  const text = `<b>🏷️ ПРЕДПРОСМОТР:</b> <b>${chunkName}</b>\n` +
               `━━━━━━━━━━━━━━━━━━\n` +
               `<b>Type:</b> ${data.noteType}\n` +
               `<b>Lang/Diff:</b> <code>${data.lang}</code> | <code>${data.difficulty}</code>\n` +
               `<b>Topic:</b> ${data.topic}\n\n` +
               `<b>Front:</b>\n${displayFront}\n` +
               `<b>Back:</b> <code>${cleanBack}</code>\n\n` +
               `<b>Extra:</b>\n<code>${data.extra}</code>\n\n` +
               `<b>💡 HINTS (тап для копирования):</b>\n${hintsFormatted}\n` +
               `━━━━━━━━━━━━━━━━━━`;

  const keyboard = {
    inline_keyboard: [
      [{ text: "✅ СОХРАНИТЬ", callback_data: `save|${draftId}` }],
      [{ text: "✏️ Type", callback_data: `menu|${draftId}|noteType` }, { text: "✏️ Lang", callback_data: `menu|${draftId}|lang` }],
      [{ text: "✏️ Topic", callback_data: `menu|${draftId}|topic` }, { text: "✏️ Diff", callback_data: `menu|${draftId}|difficulty` }],
      [{ text: "✏️ Front", callback_data: `ask|${draftId}|front` }, { text: "✏️ Back", callback_data: `ask|${draftId}|back` }],
      [{ text: "✏️ Extra", callback_data: `ask|${draftId}|extra` }, { text: "✏️ Hint", callback_data: `ask|${draftId}|hints` }]
    ]
  };

  const params = { chat_id: chatId, text: text, parse_mode: "HTML", reply_markup: keyboard };
  if (messageId) { params.message_id = messageId; sendTelegram("editMessageText", params); } 
  else { sendTelegram("sendMessage", params); }
}

// --- ОБРАБОТКА КНОПОК ---
function handleCallback(query) {
  const parts = query.data.split('|'), action = parts[0], draftId = parts[1];
  const cache = CacheService.getScriptCache();
  
  if (action === "gen_from_chunk") {
    const chunk = parts[1], aiResponse = callOpenAI(`Create a card for this chunk: "${chunk}"`);
    const newDraftId = "draft_" + query.message.message_id;
    cache.put(newDraftId, JSON.stringify(aiResponse), 1800);
    sendDraft(query.message.chat.id, aiResponse, newDraftId);
    return;
  }

  const draft = JSON.parse(cache.get(draftId));
  if (!draft) return;

  if (action === "save") {
    saveToSheet(draft);
    const chunk = draft.back.replace(/\*\*/g, '');
    
    // Красивое подтверждение сохранения (Вариант 3)
    const confirmation = `✅ <b>New Card:</b> <code>${chunk}</code>\n` +
                         `<b>${draft.noteType}</b> — <code>${draft.lang} ${draft.difficulty}</code>`;
    
    sendTelegram("editMessageText", { 
      chat_id: query.message.chat.id, 
      message_id: query.message.message_id, 
      text: confirmation, 
      parse_mode: "HTML" 
    });
    return;
  }

  if (action === "menu") {
    const field = parts[2];
    const opts = (field === "topic") ? getTopicList(draft.lang) : (field === "noteType" ? ["Cloze", "Reverse", "Transformation", "Dictation"] : (field === "lang" ? ["EN", "FR"] : ["A1", "A2", "A2→B1", "B1", "B1→B2"]));
    const buttons = opts.map(o => [{ text: o, callback_data: `set|${draftId}|${field}|${o}` }]);
    sendTelegram("editMessageText", { chat_id: query.message.chat.id, message_id: query.message.message_id, text: `Выберите ${field}:`, reply_markup: { inline_keyboard: buttons } });
  }

  if (action === "set") {
    sendTelegram("editMessageText", { chat_id: query.message.chat.id, message_id: query.message.message_id, text: "🔄 <i>Рефакторинг...</i>", parse_mode: "HTML" });
    const refactored = aiRefactor(draft, parts[2], parts[3]);
    cache.put(draftId, JSON.stringify(refactored), 1800);
    sendDraft(query.message.chat.id, refactored, draftId, query.message.message_id);
  }

  if (action === "ask") {
    const field = parts[2];
    sendTelegram("sendMessage", { chat_id: query.message.chat.id, text: `Введите значение для ${field}:`, reply_markup: { force_reply: true } });
    cache.put(`state_${query.message.chat.id}`, JSON.stringify({draftId, field}), 600);
  }
}

// --- AI РЕФАКТОРИНГ (СИНХРОНИЗАЦИЯ) ---
function aiRefactor(oldCard, field, value) {
  const prompt = `Current card: ${JSON.stringify(oldCard)}. 
  CHANGE FIELD "${field}" TO "${value}". 
  Now REGENERATE all other fields (front, back, extra, hints) so they are linguistically correct for the new "${field}" while keeping the core meaning of the chunk. 
  If Topic changed, adapt the sentence to the new scenario. 
  If Lang changed, translate everything and adapt grammar.`;
  return callOpenAI(prompt);
}

// --- ОБРАБОТКА ТЕКСТОВЫХ ПРАВОК ---
function handleEditReply(update) {
  const cache = CacheService.getScriptCache();
  const state = JSON.parse(cache.get(`state_${update.message.chat.id}`));
  if (!state) return;
  
  let draft = JSON.parse(cache.get(state.draftId));
  const newText = update.message.text;

  if (state.field === "hints") {
    draft.hints = newText.split(',').map(s => s.trim());
  } else {
    draft[state.field] = newText;
  }

  cache.put(state.draftId, JSON.stringify(draft), 1800);
  sendDraft(update.message.chat.id, draft, state.draftId);
}

// --- ВСПОМОГАТЕЛЬНЫЕ ---
function getTopicList(lang) {
  const en = ["💻 Bugs/Slack", "📅 Meetings", "🤝 Interview", "💼 Work/Meaning", "🗳️ Politics", "🎨 Art/Culture", "🍿 Cinema", "🧠 Psychology", "🌍 Relocation", "🏢 Work/Culture"];
  const fr = ["🩺 Santé/Docteur", "🔑 Location", "🛒 Magasin", "🏛️ Banque/Préfecture", "🥦 Marché", "👥 Collègues", "🌸 Fleurs/Balcon", "🗞️ Nouvelles/Élections", "🗣️ Tandem", "🖼️ Expositions", "☕ Café/Resto", "🚲 Transport"];
  return (lang === "FR" ? fr : en).concat(["🌐 General/Abstract", "🏠 Daily Routine"]);
}

function saveToSheet(d) {
  const ss = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  ss.appendRow([d.noteType, d.lang, d.difficulty, d.topic, d.front, d.back, d.extra, d.hints.join('\n'), "", "", "ожидает"]);
  const lastRow = ss.getLastRow();
  ss.getRange(lastRow, 1).setFontWeight("bold");
  ss.getRange(lastRow, 6).setFontWeight("bold");
}

function sendTelegram(method, params) {
  return UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`, {
    method: "post", contentType: "application/json", payload: JSON.stringify(params), muteHttpExceptions: true
  });
}

function sendTyping(chatId) { sendTelegram("sendChatAction", { chat_id: chatId, action: "typing" }); }