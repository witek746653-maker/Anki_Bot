const scriptProperties = PropertiesService.getScriptProperties();
const TELEGRAM_TOKEN = scriptProperties.getProperty('TELEGRAM_TOKEN');
const OPENAI_API_KEY = scriptProperties.getProperty('OPENAI_API_KEY');
const SHEET_ID = scriptProperties.getProperty('SHEET_ID');
const SHEET_NAME = 'English';

if (typeof SYSTEM_PROMPT === 'undefined' || !SYSTEM_PROMPT) {
  const promptFromProps = scriptProperties.getProperty('SYSTEM_PROMPT');
  if (promptFromProps) {
    var SYSTEM_PROMPT = promptFromProps;
  } else {
    var SYSTEM_PROMPT = '';
    Logger.log('Warning: SYSTEM_PROMPT not found.');
  }
}

function doPost(e) {
  const cache = CacheService.getScriptCache();
  let chatId;
  try {
    const update = JSON.parse(e.postData.contents);
    chatId = update.message ? update.message.chat.id : (update.callback_query ? update.callback_query.message.chat.id : null);

    if (update.message && !update.message.reply_to_message) {
      const text = normalizeIncomingText(update.message.text);
      if (!text) {
        sendTelegram("sendMessage", { chat_id: chatId, text: "Пришлите текст сообщением." });
        return;
      }
      if (!containsLetters(text)) {
        sendTelegram("sendMessage", { chat_id: chatId, text: "Пришлите слово или фразу буквами." });
        return;
      }
      if (text.split(/\s+/).length === 1 && !text.startsWith('/') && isSingleWordCandidate(text)) {
        sendTyping(chatId);
        const suggestions = getChunkSuggestions(text);
        sendChunkSuggestions(chatId, text, suggestions);
      } else if (text.split(/\s+/).length === 1 && !text.startsWith('/')) {
        sendTelegram("sendMessage", { chat_id: chatId, text: "Для одного слова пришлите обычное слово буквами." });
      } else {
        sendTyping(chatId);
        const aiResponse = callOpenAI(text, text);
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

function getChunkSuggestions(word) {
  const prompt = `User word: "${word}". Suggest 3 natural, high-frequency chunks (EN or FR).`;
  const res = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", {
    method: "post",
    headers: { "Authorization": "Bearer " + OPENAI_API_KEY, "Content-Type": "application/json" },
    muteHttpExceptions: true,
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
            properties: { suggestions: { type: "array", items: { type: "string" } } },
            required: ["suggestions"],
            additionalProperties: false
          }
        }
      }
    })
  });
  const content = JSON.parse(parseOpenAIResponse(res).choices[0].message.content);
  return content.suggestions || [];
}

function sendChunkSuggestions(chatId, word, suggestions) {
  if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) {
    sendTelegram("sendMessage", { chat_id: chatId, text: "⚠️ Не удалось подобрать чанки." });
    return;
  }
  const cache = CacheService.getScriptCache();
  const buttons = suggestions.map(function (s, index) {
    const chunkId = `chunk_${chatId}_${Date.now()}_${index}`;
    cache.put(chunkId, s, 1800);
    return [{ text: s, callback_data: `gen_from_chunk|${chunkId}` }];
  });
  sendTelegram("sendMessage", {
    chat_id: chatId,
    text: `🔍 Чанки для слова <b>${word}</b>:`,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: buttons }
  });
}

function callOpenAI(prompt, targetChunk = "", systemOverride = SYSTEM_PROMPT) {
  // 1. Программный Роутер (Router Guard)
  // Проверяем, есть ли в запросе признаки грамматики
  const isGrammar = prompt.toLowerCase().includes("grammar") ||
    prompt.toLowerCase().includes("passive") ||
    prompt.toLowerCase().includes("speech");

  const routerGuard = isGrammar
    ? "\nMODE: Grammar transformation allowed."
    : "\nCRITICAL: Topic is NOT [Grammar]. Note Type 'Transformation' is FORBIDDEN. Use Reverse or Cloze.";

  const payload = {
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: systemOverride + routerGuard },
      { role: "user", content: prompt }
    ],
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
    muteHttpExceptions: true,
    payload: JSON.stringify(payload)
  });

  const response = parseOpenAIResponse(res);
  const rawCard = JSON.parse(response.choices[0].message.content);

  // Возвращаем нормализованную карту
  return normalizeAndValidateCard(rawCard, targetChunk);
}

function normalizeAndValidateCard(card, targetChunk = "") {
  const normalized = {
    noteType: normalizeText(card.noteType),
    lang: normalizeText(card.lang),
    difficulty: normalizeText(card.difficulty),
    topic: normalizeText(card.topic),
    front: normalizeText(card.front),
    back: normalizeText(card.back), // Изначальный текст
    extra: normalizeText(card.extra),
    hints: Array.isArray(card.hints) ? card.hints.map(normalizeText).filter(Boolean) : []
  };

  // Принудительно делаем Back жирным, если ИИ забыл это сделать
  if (!normalized.back.startsWith("**")) {
    normalized.back = `**${normalized.back}**`;
  }

  normalized.hints = normalizeHintsByNoteType(normalized.noteType, normalized.hints);
  normalized.extra = sanitizeExtra(normalized.extra, normalized.back, normalized.hints);
  normalized.extra = ensureTwoLineExtra(normalized);

  enforceTypeContracts(normalized);
  enforceTargetChunkInvariant(normalized, targetChunk);
  validateCard(normalized);

  return normalized;
}

function normalizeText(value) {
  return String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function sanitizeExtra(extra, back, hints) {
  const backLower = back.replace(/\*\*/g, '').toLowerCase();
  const hintSet = {};
  hints.forEach(h => { hintSet[h.toLowerCase()] = true; });

  const cleanedLines = extra.split("\n").map(line => line.trim()).filter(Boolean)
    // Добавили "модель" в список фильтрации
    .filter(line => !/^(hint|hints|front|back|topic|type|модель)\s*:/i.test(line))
    .filter(line => !hintSet[line.toLowerCase()])
    .filter(line => !backLower || !line.toLowerCase().includes(backLower));

  return cleanedLines.slice(0, 2).join("\n");
}

function ensureTwoLineExtra(card) {
  // Просто берем то, что выдал ИИ, и следим, чтобы было не больше 2 строк
  let lines = card.extra.split("\n").map(line => line.trim()).filter(Boolean).slice(0, 2);
  if (lines.length === 0) lines.push("Перевод уточните вручную.");
  // УБРАЛИ: lines.push("Syn: —, Ant: —"); 
  return lines.join("\n");
}


function extractHintContent(hint) {
  if (!hint) return "";
  let content = hint.includes(':') ? hint.split(':').slice(1).join(':').trim() : hint.trim();
  content = content.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}]/gu, '').trim();
  return content;
}

function getBuildVersionLabel() {
  const now = new Date();
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const min = String(now.getUTCMinutes()).padStart(2, "0");
  return `${dd}.${mm} ${hh}:${min} UTC`;
}

function getExpectedHintPrefixes(noteType) {
  return noteType === "Transformation"
    ? ["🧱 Structure:", "🎯 Trigger:", "🎭 Scenario:", "📖 Definition:", "👁️ Visual:", "↔️ Contrast:", "⚠️ False Friend:"]
    : ["🧱 Structure:", "🔄 Synonym:", "🎭 Scenario:", "📖 Definition:", "👁️ Visual:", "🔗 Collocation:", "🎚️ Register:"];
}

function normalizeHintsByNoteType(type, hints) {
  const exp = getExpectedHintPrefixes(type);
  const src = (hints || []).map(normalizeHintAliases);

  return exp.map((p, i) => {
    // Ищем совпадение по префиксу или берем по индексу
    const h = src.find(s => s.startsWith(p)) || src[i] || "";
    const c = extractHintContent(h);
    // Возвращаем контент с префиксом или только префикс, если данных нет
    return c ? `${p} ${c}` : p;
  });
}

function normalizeHintAliases(hint) {
  let line = String(hint || "").trim();
  line = line.replace(/^📦\s*Structure:/, "🧱 Structure:");
  line = line.replace(/^🧷\s*Collocation:/, "🔗 Collocation:");
  return line;
}

function normalizeRegisterLine(line) {
  const prefix = "🎚️ Register:";
  const content = extractHintContent(line);
  if (!content || /отсутств|none|n\/a/i.test(content)) {
    return `${prefix} Neutral — suitable for both spoken and written English.`;
  }
  return `${prefix} ${content}`;
}

function getHintFallback(card) {
  const backLower = card.back.toLowerCase();
  for (const hint of card.hints) {
    if (!hint) continue;
    const content = extractHintContent(hint);
    if (content && !content.toLowerCase().includes(backLower)) return content;
  }
  if (card.noteType === "Transformation") return "Грамматическую помету уточните вручную.";
  if (card.noteType === "Dictation") return "Орфографическую помету уточните вручную.";
  return "Помету по употреблению уточните вручную.";
}

function validateCard(card) {
  const allowedNoteTypes = ["Cloze", "Reverse", "Transformation", "Dictation"];
  const allowedLangs = ["EN", "FR"];
  const allowedDifficulty = ["A1", "A2", "A2→B1", "B1", "B1→B2"];
  if (!allowedNoteTypes.includes(card.noteType)) throw new Error("Некорректный noteType.");
  if (!allowedLangs.includes(card.lang)) throw new Error("Некорректный lang.");
  if (!allowedDifficulty.includes(card.difficulty)) throw new Error("Некорректный difficulty.");
  if (!card.topic || !card.back) throw new Error("Пустой topic или back.");
  if (card.front.split('\n').filter(Boolean).length < 1) throw new Error("Поле Front не должно быть пустым.");

  const frontLines = card.front.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0);

  if (!Array.isArray(card.hints) || card.hints.length !== 7) throw new Error("Hint должен содержать 7 строк.");
  const extraLines = card.extra.split("\n").map(s => s.trim()).filter(Boolean);
  if (extraLines.length < 1 || extraLines.length > 2) throw new Error("Extra должен содержать от 1 до 2 строк.");
  const backLower = card.back.toLowerCase();
  if (extraLines.some(line => line.toLowerCase().includes(backLower))) throw new Error("Extra повторяет Back.");
  const expectedHintPrefixes = getExpectedHintPrefixes(card.noteType);
  expectedHintPrefixes.forEach((prefix, index) => {
    if (!card.hints[index] || !card.hints[index].startsWith(prefix)) throw new Error(`Ошибка в Hint: ${prefix}`);
  });
  const hintSet = {};
  card.hints.forEach(h => { hintSet[h.toLowerCase()] = true; });
  if (extraLines.some(line => hintSet[line.toLowerCase()])) throw new Error("Extra содержит строку из Hint.");
}

function enforceTypeContracts(card) {
  if (card.noteType === "Cloze") {
    card.front = enforceClozeFront(card.front, card.back);
  }
}

function enforceClozeFront(front, back) {
  const cleanFront = normalizeText(front);
  const escapedBack = escapeRegex(back);
  const hasExact = new RegExp(`\\{\\{c1::\\s*${escapedBack}\\s*\\}\\}`, "i").test(cleanFront);
  if (hasExact) return cleanFront;
  const plainBackRegex = new RegExp(escapedBack, "i");
  if (plainBackRegex.test(cleanFront)) {
    return cleanFront.replace(plainBackRegex, `{{c1::${back}}}`);
  }
  return `Use the chunk in context: {{c1::${back}}}.`;
}

function enforceTargetChunkInvariant(card, targetChunk) {
  const normalizedTarget = normalizeText(targetChunk);
  if (!normalizedTarget) return;
  card.back = normalizedTarget;
  if (card.noteType === "Cloze") {
    card.front = enforceClozeFront(card.front, card.back);
  }
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sendDraft(chatId, data, draftId, messageId = null) {
  const chunkName = data.back.replace(/\*\*/g, '');
  const buildVersion = getBuildVersionLabel();
  const hintsFormatted = data.hints.map(h => `<code>${h}</code>`).join('\n');
  const cleanBack = data.back.replace(/\*\*/g, '');
  const displayFront = (data.noteType === "Dictation") ? "<i>🎧 [Audio Mode]</i>" : `<blockquote><code>${data.front}</code></blockquote>`;
  const text = `<b>🏷️ ПРЕДПРОСМОТР v.${buildVersion}:</b> <b>${chunkName}</b>\n` +
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

function handleCallback(query) {
  const parts = query.data.split('|'), action = parts[0], draftId = parts[1];
  const cache = CacheService.getScriptCache();
  if (action === "gen_from_chunk") {
    const chunk = cache.get(parts[1]);
    if (!chunk) { sendTelegram("sendMessage", { chat_id: query.message.chat.id, text: "Черновик устарел." }); return; }
    const aiResponse = callOpenAI(`Create a card for this chunk: "${chunk}"`, chunk);
    const newDraftId = "draft_" + query.message.message_id;
    cache.put(newDraftId, JSON.stringify(aiResponse), 1800);
    sendDraft(query.message.chat.id, aiResponse, newDraftId);
    return;
  }
  const draft = JSON.parse(cache.get(draftId));
  if (!draft) return;
  if (action === "save") {
    const safeDraft = normalizeAndValidateCard(draft, draft.back);
    cache.put(draftId, JSON.stringify(safeDraft), 1800);
    saveToSheet(safeDraft);
    const chunk = safeDraft.back.replace(/\*\*/g, '');
    const confirmation = `✅ <b>New Card:</b> <code>${chunk}</code>\n<b>${safeDraft.noteType}</b> — <code>${safeDraft.lang} ${safeDraft.difficulty}</code>`;
    sendTelegram("editMessageText", { chat_id: query.message.chat.id, message_id: query.message.message_id, text: confirmation, parse_mode: "HTML" });
    return;
  }
  if (action === "menu") {
    const field = parts[2];
    const opts = (field === "topic") ? getTopicList(draft.lang) : (field === "noteType" ? ["Cloze", "Reverse", "Transformation", "Dictation"] : (field === "lang" ? ["EN", "FR"] : ["A1", "A2", "A2→B1", "B1", "B1→B2"]));
    const buttons = opts.map(o => [{ text: o, callback_data: `set|${draftId}|${field}|${o}` }]);
    buttons.push([{ text: "⬅️ Назад", callback_data: `back|${draftId}` }]);
    sendTelegram("editMessageText", {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id,
      text: `<b>✏️ Редактирование [v.NEW]</b>\nВыберите ${field}:`,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: buttons }
    });
  }
  if (action === "set") {
    sendTelegram("editMessageText", { chat_id: query.message.chat.id, message_id: query.message.message_id, text: "🔄 <i>Рефакторинг...</i>", parse_mode: "HTML" });
    const refactored = aiRefactor(draft, parts[2], parts[3]);
    cache.put(draftId, JSON.stringify(refactored), 1800);
    sendDraft(query.message.chat.id, refactored, draftId, query.message.message_id);
  }
  if (action === "back") {
    sendDraft(query.message.chat.id, draft, draftId, query.message.message_id);
  }
  if (action === "ask") {
    const field = parts[2];
    sendTelegram("sendMessage", { chat_id: query.message.chat.id, text: `Введите значение для ${field}:`, reply_markup: { force_reply: true } });
    sendTelegram("sendMessage", {
      chat_id: query.message.chat.id,
      text: "Если передумали, вернитесь к карточке:",
      reply_markup: { inline_keyboard: [[{ text: "⬅️ Назад", callback_data: `back|${draftId}` }]] }
    });
    cache.put(`state_${query.message.chat.id}`, JSON.stringify({ draftId, field, messageId: query.message.message_id }), 600);
  }
}

function aiRefactor(oldCard, field, value) {
  const immutable = {
    back: normalizeText(oldCard.back),
    lang: normalizeText(oldCard.lang),
    difficulty: normalizeText(oldCard.difficulty)
  };
  const prompt = `Current card JSON: ${JSON.stringify(oldCard)}.
Target operation: CHANGE ONLY FIELD "${field}" TO "${value}".
Hard invariants:
1) Keep Back/Answer EXACTLY unchanged and equal to "${immutable.back}".
2) Keep lang and difficulty unchanged unless the edited field is exactly "lang" or "difficulty".
3) Reformat structure for the target noteType, but DO NOT replace chunk semantics.
4) Never paraphrase, synonymize, lemmatize, or POS-convert Back/Answer.
Return valid JSON matching schema only.`;
  const refactored = callOpenAI(prompt, immutable.back);
  return enforceImmutableRefactorFields(oldCard, refactored, field, immutable);
}

function enforceImmutableRefactorFields(oldCard, refactoredCard, field, immutable) {
  const safe = Object.assign({}, refactoredCard);
  safe.back = immutable.back;
  if (field !== "lang") safe.lang = immutable.lang;
  if (field !== "difficulty") safe.difficulty = immutable.difficulty;
  return normalizeAndValidateCard(safe, immutable.back);
}

function handleEditReply(update) {
  const cache = CacheService.getScriptCache();
  const state = JSON.parse(cache.get(`state_${update.message.chat.id}`));
  if (!state) return;
  let draft = JSON.parse(cache.get(state.draftId));
  if (!draft) return;
  const newText = update.message.text;
  if (state.field === "hints") { draft.hints = newText.split(',').map(s => s.trim()); } else { draft[state.field] = newText; }
  cache.put(state.draftId, JSON.stringify(draft), 1800);
  sendDraft(update.message.chat.id, draft, state.draftId, state.messageId || null);
}

function getTopicList(lang) {
  const en = ["💻 Bugs/Slack", "🤝 Meetings", "👔 Interview", "🌱 Work/Meaning", "🏛️ Politics", "🎨 Art/Culture", "🎬 Cinema", "🧠 Psychology", "✈️ Relocation", "☕ Work/Culture"];
  const fr = ["🏥 Santé/Docteur", "🔑 Location", "🛒 Magasin", "📂 Banque/Préfecture", "🧺 Marché", "💼 Collègues", "🌸 Fleurs/Balcon", "🗞️ Nouvelles/Élections", "🗣️ Tandem", "🏛️ Expositions", "🍽️ Café/Resto", "🚌 Transport"];
  const univ = ["🌫️ General/Abstract", "⏰ Daily Routine", "📑 Technical Docs", "🍻 Socializing/Pub", "💬 Small Talk"];
  return (lang === "FR" ? fr : en).concat(univ);
}

function saveToSheet(d) {
  const ss = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  ss.appendRow([d.noteType, d.lang, d.difficulty, d.topic, d.front, d.back, d.extra, d.hints.join('\n'), "", "", "ожидает"]);
  const lastRow = ss.getLastRow();
  ss.getRange(lastRow, 1).setFontWeight("bold");
  ss.getRange(lastRow, 6).setFontWeight("bold");
}

function sendTelegram(method, params) {
  const response = UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`, {
    method: "post", contentType: "application/json", payload: JSON.stringify(params), muteHttpExceptions: true
  });
  return parseTelegramResponse(response, method);
}

function sendTyping(chatId) { sendTelegram("sendChatAction", { chat_id: chatId, action: "typing" }); }
function normalizeIncomingText(value) { return typeof value === "string" ? value.trim() : ""; }
function containsLetters(value) { return /[A-Za-zА-Яа-яЁё]/.test(value); }
function isSingleWordCandidate(value) { return /^[A-Za-zА-Яа-яЁё'-]+$/.test(value); }

function parseTelegramResponse(response, method) {
  const statusCode = response.getResponseCode();
  const body = response.getContentText();
  if (statusCode < 200 || statusCode >= 300) throw new Error(`Telegram API error (${method}, HTTP ${statusCode}).`);
  const data = JSON.parse(body);
  if (!data.ok) throw new Error(`Telegram API error (${method}): ${data.description || 'unknown error'}.`);
  return data;
}

function parseOpenAIResponse(response) {
  const statusCode = response.getResponseCode();
  const body = response.getContentText();
  if (statusCode < 200 || statusCode >= 300) throw new Error(`OpenAI API error (HTTP ${statusCode}).`);
  const data = JSON.parse(body);
  if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) throw new Error("OpenAI returned empty response.");
  return data;
}

function debugConfig() {
  Logger.log("TELEGRAM_TOKEN: " + !!TELEGRAM_TOKEN);
  Logger.log("OPENAI_API_KEY: " + !!OPENAI_API_KEY);
  Logger.log("SHEET_ID: " + !!SHEET_ID);
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  Logger.log("Sheet found: " + !!sheet);
}

function getWebhookInfoAdmin() {
  const res = UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getWebhookInfo`, {
    method: "get",
    muteHttpExceptions: true
  });
  Logger.log(res.getContentText());
  return res.getContentText();
}

function setWebhookAdmin(url) {
  const payload = {
    url: url,
    allowed_updates: ["message", "callback_query"]
  };
  const res = UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  Logger.log(res.getContentText());
  return res.getContentText();
}

function setWebhookToCurrentDeploymentAdmin() {
  const webAppUrl = ScriptApp.getService().getUrl();
  return setWebhookAdmin(webAppUrl);
}