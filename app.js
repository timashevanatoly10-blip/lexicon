const API_BASE = "https://lexicon-worker.timashevanatoly10.workers.dev";
const TOKEN_STORAGE_KEY = "lexicon_access_token";
const LEXICON_STORAGE_KEY = "lexicon_dictionaries_v1";

let currentDocumentId = "";
let currentDocumentKey = "";
let dictionaries = loadDictionaries();
let expandedDictionaryId = null;
let lastWordTranslateSource = "";

let textTranslationReady = false;
let textActivePanel = "source";
let textSourceValue = "";
let textTranslatedValue = "";
let selectedTextWord = "";
let selectedTextWordElement = null;
let textQuickTranslateRequestId = 0;
let textQuickTranslateTimer = null;
const textPanelScroll = {
  source: 0,
  translation: 0
};

// ===== PAGES =====
const homePage = document.getElementById("homePage");
const filesPage = document.getElementById("filesPage");
const aiPage = document.getElementById("aiPage");
const lexiconPage = document.getElementById("lexiconPage");

// ===== NAV =====
const openFilesBtn = document.getElementById("openFilesBtn");
const openAiBtn = document.getElementById("openAiBtn");
const brandBtn = document.getElementById("brandBtn");

let backHomeFromFilesBtn = document.getElementById("backHomeFromFilesBtn");
let backHomeFromAiBtn = document.getElementById("backHomeFromAiBtn");
let backHomeFromLexiconBtn = document.getElementById("backHomeFromLexiconBtn");

// ===== HOME UI =====
const wordModeBtn = document.getElementById("wordModeBtn");
const textModeBtn = document.getElementById("textModeBtn");
const wordInputBox = document.getElementById("wordInputBox");
const textInputBox = document.getElementById("textInputBox");
const wordTranslateBtn = document.getElementById("wordTranslateBtn");
const textTranslateBtn = document.getElementById("textTranslateBtn");
const homeResultCard = document.getElementById("homeResultCard");
const homeResult = document.getElementById("homeResult");
let addCurrentWordToDictionaryBtn = null;

// ===== FILES UI =====
let fileInput = document.getElementById("fileInput");
let targetLang = document.getElementById("targetLang");
let uploadBtn = document.getElementById("uploadBtn");
let statusCard = document.getElementById("statusCard");
let statusText = document.getElementById("statusText");
let checkBtn = document.getElementById("checkBtn");
let downloadBtn = document.getElementById("downloadBtn");
let manualId = document.getElementById("manualId");
let manualKey = document.getElementById("manualKey");
let manualCheckBtn = document.getElementById("manualCheckBtn");

ensureTextModeMarkup();
ensureFilesPageMarkup();
refreshFileElements();
bindEvents();
initAccessToken();
ensureDictionaryPickerStyles();
bootstrapDictionaries();
showPage("home");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

function bindEvents() {
  on(uploadBtn, "click", uploadFile);
  on(checkBtn, "click", checkStatus);
  on(downloadBtn, "click", downloadResult);
  on(manualCheckBtn, "click", checkManual);

  on(openFilesBtn, "click", () => showPage("files"));
  on(openAiBtn, "click", () => showPage("ai"));
  on(brandBtn, "click", () => showPage("lexicon"));

  on(backHomeFromFilesBtn, "click", () => showPage("home"));
  on(backHomeFromAiBtn, "click", () => showPage("home"));
  on(backHomeFromLexiconBtn, "click", () => showPage("home"));

  on(wordModeBtn, "click", () => setMode("word"));
  on(textModeBtn, "click", () => setMode("text"));

  on(wordTranslateBtn, "click", handleWordTranslate);

  bindTextModeEvents();
}

function on(el, eventName, handler) {
  if (el) el.addEventListener(eventName, handler);
}

function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
}

function ensureDictionaryPickerStyles() {
  if (document.getElementById("dictionaryPickerStyles")) return;

  const style = document.createElement("style");
  style.id = "dictionaryPickerStyles";
  style.textContent = `
    @keyframes dictionaryPickerRise {
      from { transform: translateY(18px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .text-word-token {
      display: inline;
      padding: 1px 3px;
      margin: 0 1px;
      border-radius: 8px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.12s ease, color 0.12s ease, box-shadow 0.12s ease;
    }

    .text-word-token.selected {
      background: rgba(95, 153, 98, 0.13);
      color: #1f6f56;
      box-shadow: 0 0 0 1px rgba(95, 153, 98, 0.28) inset;
    }

    .text-clickable-output {
      white-space: pre-wrap;
      line-height: 1.55;
      word-break: break-word;
    }

    .text-mode-shell {
      --neo-bg: #f3f4f1;
      --neo-surface: #fbfbf8;
      --neo-surface-2: #fdfdfc;
      --neo-white: #ffffff;
      --neo-green: #5f9962;
      --neo-green-deep: #1f6f56;
      --neo-muted: #777a77;
      --neo-text: #1f211f;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .text-mode-actions-compact {
      position: relative;
      display: grid;
      grid-template-columns: 68px minmax(0, 1fr) 68px;
      align-items: center;
      gap: 14px;
      width: 100%;
      min-height: 76px;
      padding: 8px 12px;
      border-radius: 42px;
      background: rgba(251, 251, 248, 0.84);
      box-shadow: -12px -12px 24px rgba(255,255,255,0.96), 12px 14px 32px rgba(186,193,184,0.30), inset 1px 1px 0 rgba(255,255,255,0.78);
    }

    .text-action-secondary,
    .text-action-primary {
      border: 0;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .text-add-lex-btn,
    .text-translate-compact-btn {
      width: 60px;
      min-width: 60px;
      height: 60px;
      padding: 0;
      border-radius: 999px;
      background: #fdfdfc;
      color: #5f9962;
      font-size: 40px;
      font-weight: 500;
      line-height: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: -9px -9px 18px rgba(255,255,255,0.98), 9px 10px 22px rgba(186,193,184,0.36);
      transition: transform 0.12s ease, opacity 0.12s ease, box-shadow 0.12s ease;
    }

    .text-translate-compact-btn {
      font-size: 42px;
      padding-bottom: 5px;
    }

    .text-add-lex-btn:active,
    .text-translate-compact-btn:active,
    .text-bottom-icon-btn:active {
      transform: scale(0.96);
      box-shadow: -4px -4px 10px rgba(255,255,255,0.98), 4px 5px 12px rgba(186,193,184,0.34), inset 2px 2px 6px rgba(186,193,184,0.12);
    }

    .text-add-lex-btn:disabled { opacity: 0.62; color: #5f9962; }

    #textAddLexBtn.active {
      opacity: 1;
      color: #5f9962;
      background: #fdfdfc;
      border-color: transparent;
      font-weight: 500;
    }

    .text-word-mini-display {
      min-width: 0;
      height: 58px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: 22px;
      background: transparent;
      color: #1f6f56;
      font-size: clamp(18px, 4.8vw, 27px);
      font-weight: 500;
      line-height: 1.15;
      letter-spacing: 0.01em;
      text-align: center;
      white-space: nowrap;
      text-overflow: ellipsis;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: opacity 0.18s ease, transform 0.18s ease;
    }

    .text-word-mini-display.loading { letter-spacing: 0.18em; opacity: 0.72; }
    .text-word-mini-display.ready { opacity: 1; transform: translateY(0); background: transparent; }

    .text-panel-tabs {
      display: grid !important;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      background: rgba(251, 251, 248, 0.86) !important;
      padding: 8px !important;
      border-radius: 32px !important;
      box-shadow: -10px -10px 20px rgba(255,255,255,0.92), 10px 12px 26px rgba(186,193,184,0.28), inset 1px 1px 0 rgba(255,255,255,0.8);
    }

    .text-panel-tabs.hidden {
      display: none !important;
    }

    .text-panel-tab {
      min-height: 54px;
      border: 0 !important;
      border-radius: 26px !important;
      background: transparent !important;
      color: #777a77 !important;
      font-size: clamp(17px, 4.5vw, 26px);
      font-weight: 500 !important;
      letter-spacing: 0.01em;
      cursor: pointer;
      box-shadow: none !important;
    }

    .text-panel-tab.active {
      background: #ffffff !important;
      color: #5f9962 !important;
      box-shadow: -7px -7px 14px rgba(255,255,255,0.98), 7px 8px 17px rgba(186,193,184,0.24) !important;
    }

    .text-swipe-frame {
      width: 100% !important;
      height: min(61vh, 650px) !important;
      min-height: 485px !important;
      overflow: hidden !important;
      border: 0 !important;
      border-radius: 34px !important;
      background: #fbfbf8 !important;
      box-shadow: -14px -14px 28px rgba(255,255,255,0.95), 14px 18px 42px rgba(180,186,176,0.30), inset 1px 1px 0 rgba(255,255,255,0.85) !important;
    }

    .text-swipe-track { width: 200%; height: 100%; display: flex; transition: transform 0.24s ease; }

    .text-panel {
      position: relative;
      width: 50%;
      height: 100%;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      background: #fbfbf8 !important;
      border: 0 !important;
      border-radius: 0 !important;
      padding: 0 !important;
    }

    .text-big-input,
    .text-clickable-output,
    .text-translation-output {
      width: 100%;
      min-height: calc(100% - 88px);
      border: 0 !important;
      outline: none !important;
      box-shadow: none !important;
      background: transparent !important;
      color: #1f211f;
      padding: 32px 34px 110px !important;
      font-size: clamp(22px, 5.8vw, 34px);
      font-weight: 400;
      line-height: 1.42;
      letter-spacing: -0.015em;
      white-space: pre-wrap;
    }

    .text-big-input { height: calc(100% - 88px); resize: none; }
    .text-big-input::placeholder { color: rgba(119,122,119,0.42); }

    .text-bottom-toolbar {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 7;
      display: flex;
      align-items: center;
      justify-content: space-around;
      gap: 16px;
      padding: 18px 32px 24px;
      background: linear-gradient(to top, rgba(251,251,248,0.98) 0%, rgba(251,251,248,0.92) 70%, rgba(251,251,248,0) 100%);
      pointer-events: none;
    }

    .text-bottom-icon-btn {
      pointer-events: auto;
      width: 56px;
      height: 56px;
      border: 0;
      border-radius: 999px;
      background: #fdfdfc;
      color: #5f9962;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      box-shadow: -8px -8px 16px rgba(255,255,255,0.98), 8px 9px 19px rgba(186,193,184,0.34);
      -webkit-tap-highlight-color: transparent;
      cursor: pointer;
    }

    .text-bottom-icon-btn svg { width: 25px; height: 25px; stroke: currentColor; stroke-width: 2.3; fill: none; stroke-linecap: round; stroke-linejoin: round; }
    .text-bottom-icon-btn.text-bottom-clear svg { width: 24px; height: 24px; stroke-width: 2.6; }
    .text-bottom-icon-btn.hidden { display: none; }
    .text-mode-hint { display: none !important; }

    @media (max-width: 520px) {
      .text-mode-shell { gap: 11px; }
      .text-mode-actions-compact { grid-template-columns: 62px minmax(0, 1fr) 62px; min-height: 70px; gap: 12px; padding: 7px 10px; border-radius: 36px; }
      .text-add-lex-btn, .text-translate-compact-btn { width: 56px; min-width: 56px; height: 56px; font-size: 38px; }
      .text-panel-tab { min-height: 48px; }
      .text-swipe-frame { height: min(58vh, 590px) !important; min-height: 430px !important; border-radius: 32px !important; }
      .text-big-input, .text-clickable-output, .text-translation-output { padding: 28px 32px 104px !important; }
      .text-bottom-toolbar { padding: 16px 28px 22px; }
      .text-bottom-icon-btn { width: 53px; height: 53px; }
    }

    @media (max-width: 390px) {
      .text-mode-actions-compact { grid-template-columns: 58px minmax(0, 1fr) 58px; gap: 9px; }
      .text-add-lex-btn, .text-translate-compact-btn { width: 52px; min-width: 52px; height: 52px; font-size: 35px; }
      .text-bottom-toolbar { gap: 10px; padding-left: 22px; padding-right: 22px; }
      .text-bottom-icon-btn { width: 50px; height: 50px; }
    }
  `;

  document.head.appendChild(style);
}

// ===== AI API =====
async function callAi(mode, text, options = {}) {
  if (!ensureAccessToken()) {
    throw new Error("Нет токена доступа.");
  }

  const res = await fetch(`${API_BASE}/api/ai`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      mode,
      text,
      source_lang: options.sourceLang || "EN",
      target_lang: options.targetLang || "RU"
    })
  });

  return await readJsonOrThrow(res);
}

async function handleWordTranslate() {
  const wordInput = document.getElementById("wordInput");
  const source = wordInput ? wordInput.value.trim() : "";

  if (!source) {
    if (wordInput) wordInput.focus();
    return;
  }

  lastWordTranslateSource = source;

  if (homeResultCard) homeResultCard.classList.remove("hidden");
  hideAddCurrentWordButton();
  showHomeResult("Перевожу через GPT...");

  if (wordTranslateBtn) wordTranslateBtn.disabled = true;

  try {
    const data = await callAi("word_translate", source);
    showHomeResult(data.result || data.raw || "Пустой ответ.");
    showAddCurrentWordButton(source);
  } catch (err) {
    showHomeResult("Ошибка перевода:\n" + err.message);
  } finally {
    if (wordTranslateBtn) wordTranslateBtn.disabled = false;
  }
}

async function buildShortWordCard(word) {
  const data = await callAi("word_card_short", word);
  const card = data.result || {};

  return {
    word: String(card.word || word || "").trim(),
    transcription: String(card.transcription || "—").trim(),
    translation: String(card.translation || "перевод позже").trim(),
    partOfSpeech: String(card.partOfSpeech || card.part_of_speech || "").trim()
  };
}


// ===== DICTIONARIES API / D1 =====
async function dictionaryApi(path, options = {}) {
  if (!ensureAccessToken()) {
    throw new Error("Нет токена доступа.");
  }

  const headers = {
    ...authHeaders(),
    ...(options.headers || {})
  };

  let res;

  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });
  } catch (err) {
    throw new Error("Не удалось связаться с Worker/D1. Проверь деплой Worker, CORS и интернет.\n" + err.message);
  }

  return await readJsonOrThrow(res);
}

function normalizeDictionaryFromApi(dict) {
  return {
    id: String(dict.id || uid("dict")),
    title: String(dict.title || "Без названия"),
    note: String(dict.note || "личный словарь"),
    words: Array.isArray(dict.words) ? dict.words.map(normalizeWordFromApi) : [],
    createdAt: dict.createdAt || dict.created_at || new Date().toISOString(),
    updatedAt: dict.updatedAt || dict.updated_at || new Date().toISOString()
  };
}

function normalizeWordFromApi(item) {
  return {
    id: String(item.id || uid("word")),
    word: String(item.word || "").trim(),
    transcription: String(item.transcription || "—").trim(),
    translation: String(item.translation || "перевод позже").trim(),
    partOfSpeech: String(item.partOfSpeech || item.part_of_speech || "").trim(),
    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    updatedAt: item.updatedAt || item.updated_at || new Date().toISOString()
  };
}

async function bootstrapDictionaries() {
  if (!getAccessToken()) return;

  const localDictionaries = loadDictionaries();

  try {
    const data = await dictionaryApi("/api/dictionaries", {
      method: "GET"
    });

    const cloudDictionaries = Array.isArray(data.dictionaries)
      ? data.dictionaries.map(normalizeDictionaryFromApi)
      : [];

    if (!cloudDictionaries.length && localDictionaries.length) {
      dictionaries = localDictionaries;
      saveDictionaries();

      await migrateLocalDictionariesToCloud(localDictionaries);

      const afterMigration = await dictionaryApi("/api/dictionaries", {
        method: "GET"
      });

      dictionaries = Array.isArray(afterMigration.dictionaries)
        ? afterMigration.dictionaries.map(normalizeDictionaryFromApi)
        : localDictionaries;
    } else {
      dictionaries = cloudDictionaries;
    }

    saveDictionaries();

    if (lexiconPage && lexiconPage.classList.contains("active")) {
      renderLexiconPage();
    }
  } catch (err) {
    console.warn("Cloud dictionaries are unavailable, using local cache:", err);
    dictionaries = localDictionaries;
    saveDictionaries();

    if (lexiconPage && lexiconPage.classList.contains("active")) {
      renderLexiconPage();
      const list = document.getElementById("dictionaryList");
      if (list && !dictionaries.length) {
        list.innerHTML = `<div class="lexicon-empty">Облако D1 недоступно: ${escapeHTML(err.message)}</div>`;
      }
    }
  }
}

async function migrateLocalDictionariesToCloud(localDictionaries) {
  for (const dict of localDictionaries) {
    if (!dict || !dict.id) continue;

    try {
      await createDictionaryInCloud(dict);
    } catch (err) {
      console.warn("Dictionary migration failed:", dict.title, err);
      continue;
    }

    for (const word of dict.words || []) {
      if (!word || !word.word) continue;

      try {
        await createWordInCloud(dict.id, word);
      } catch (err) {
        console.warn("Word migration failed:", word.word, err);
      }
    }
  }
}

async function createDictionaryInCloud(dict) {
  return await dictionaryApi("/api/dictionaries", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: dict.id,
      title: dict.title,
      note: dict.note
    })
  });
}

async function updateDictionaryInCloud(dict) {
  return await dictionaryApi(`/api/dictionaries/${encodeURIComponent(dict.id)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: dict.title,
      note: dict.note
    })
  });
}

async function deleteDictionaryInCloud(dictionaryId) {
  return await dictionaryApi(`/api/dictionaries/${encodeURIComponent(dictionaryId)}`, {
    method: "DELETE"
  });
}

async function createWordInCloud(dictionaryId, wordItem) {
  return await dictionaryApi(`/api/dictionaries/${encodeURIComponent(dictionaryId)}/words`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: wordItem.id,
      word: wordItem.word,
      transcription: wordItem.transcription,
      translation: wordItem.translation,
      partOfSpeech: wordItem.partOfSpeech
    })
  });
}

async function deleteWordInCloud(dictionaryId, wordId) {
  return await dictionaryApi(`/api/dictionaries/${encodeURIComponent(dictionaryId)}/words/${encodeURIComponent(wordId)}`, {
    method: "DELETE"
  });
}

async function createWordInCloudWithDictionaryRetry(dict, wordItem) {
  try {
    return await createWordInCloud(dict.id, wordItem);
  } catch (err) {
    const message = String(err && err.message ? err.message : err);

    if (!message.includes("Dictionary not found")) {
      throw err;
    }

    await createDictionaryInCloud(dict);
    return await createWordInCloud(dict.id, wordItem);
  }
}


function showAddCurrentWordButton(word) {
  if (!homeResultCard || !word) return;

  ensureAddCurrentWordButton();

  if (!addCurrentWordToDictionaryBtn) return;

  addCurrentWordToDictionaryBtn.textContent = "+ В словарь";
  addCurrentWordToDictionaryBtn.disabled = false;
  addCurrentWordToDictionaryBtn.classList.remove("hidden");
}

function hideAddCurrentWordButton() {
  if (addCurrentWordToDictionaryBtn) {
    addCurrentWordToDictionaryBtn.classList.add("hidden");
    addCurrentWordToDictionaryBtn.disabled = false;
  }
}

function ensureAddCurrentWordButton() {
  if (addCurrentWordToDictionaryBtn && document.body.contains(addCurrentWordToDictionaryBtn)) {
    return;
  }

  if (!homeResultCard) return;

  addCurrentWordToDictionaryBtn = document.createElement("button");
  addCurrentWordToDictionaryBtn.id = "addCurrentWordToDictionaryBtn";
  addCurrentWordToDictionaryBtn.type = "button";
  addCurrentWordToDictionaryBtn.className = "primary hidden";
  addCurrentWordToDictionaryBtn.style.marginTop = "14px";
  addCurrentWordToDictionaryBtn.textContent = "+ В словарь";

  addCurrentWordToDictionaryBtn.addEventListener("click", addCurrentWordTranslationToDictionary);

  homeResultCard.appendChild(addCurrentWordToDictionaryBtn);
}

async function addCurrentWordTranslationToDictionary() {
  const word = (lastWordTranslateSource || document.getElementById("wordInput")?.value || "").trim();

  if (!word) {
    alert("Нет слова для добавления.");
    return;
  }

  const dictionaryId = await chooseDictionaryIdFromModal(word);

  if (!dictionaryId) return;

  if (addCurrentWordToDictionaryBtn) {
    addCurrentWordToDictionaryBtn.disabled = true;
    addCurrentWordToDictionaryBtn.textContent = "Добавляю...";
  }

  try {
    await addWordCardToDictionary(dictionaryId, word);

    if (addCurrentWordToDictionaryBtn) {
      addCurrentWordToDictionaryBtn.textContent = "Добавлено";
    }
  } catch (err) {
    alert("Не удалось добавить слово:\n" + err.message);

    if (addCurrentWordToDictionaryBtn) {
      addCurrentWordToDictionaryBtn.textContent = "+ В словарь";
      addCurrentWordToDictionaryBtn.disabled = false;
    }
  }
}

function chooseDictionaryIdFromModal(selectedWord = "") {
  return new Promise((resolve) => {
    closeDictionaryPickerModal();

    const overlay = document.createElement("div");
    overlay.id = "dictionaryPickerOverlay";
    overlay.style.position = "fixed";
    overlay.style.left = "0";
    overlay.style.right = "0";
    overlay.style.top = "0";
    overlay.style.bottom = "0";
    overlay.style.zIndex = "9999";
    overlay.style.background = "rgba(10, 20, 15, 0.32)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "flex-end";
    overlay.style.justifyContent = "center";
    overlay.style.padding = "16px";

    const sheet = document.createElement("div");
    sheet.style.width = "min(520px, 100%)";
    sheet.style.maxHeight = "82vh";
    sheet.style.overflow = "auto";
    sheet.style.background = "#ffffff";
    sheet.style.border = "1px solid #d7e1da";
    sheet.style.borderRadius = "24px";
    sheet.style.boxShadow = "0 18px 50px rgba(20, 40, 30, 0.22)";
    sheet.style.padding = "16px";
    sheet.style.animation = "dictionaryPickerRise 0.18s ease-out";

    const word = (selectedWord || lastWordTranslateSource || document.getElementById("wordInput")?.value || "").trim();

    sheet.innerHTML = `
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:12px;">
        <div>
          <div style="font-size:20px; font-weight:800; color:#17211b;">Добавить в словарь</div>
          <div style="font-size:14px; color:#6d7a72; margin-top:2px;">${escapeHTML(word || "слово")}</div>
        </div>
        <button id="dictionaryPickerCloseBtn" type="button" style="border:0; background:#f3f7f4; border-radius:999px; width:38px; height:38px; font-size:22px; line-height:1; color:#17211b;">×</button>
      </div>

      <div id="dictionaryPickerList"></div>

      <button id="dictionaryPickerNewBtn" type="button" style="width:100%; margin-top:12px; border:1px dashed #4f8f68; background:#f5faf6; color:#2f6f4b; border-radius:16px; padding:14px 16px; font-weight:800; text-align:center;">
        + Новый словарь
      </button>

      <button id="dictionaryPickerCancelBtn" type="button" style="width:100%; margin-top:10px; border:0; background:#f3f7f4; color:#6d7a72; border-radius:16px; padding:13px 16px; font-weight:700;">
        Отмена
      </button>
    `;

    overlay.appendChild(sheet);
    document.body.appendChild(overlay);

    const finish = (dictionaryId) => {
      closeDictionaryPickerModal();
      resolve(dictionaryId || "");
    };

    const list = sheet.querySelector("#dictionaryPickerList");

    if (list) {
      if (!dictionaries.length) {
        list.innerHTML = `
          <div style="background:#f7fbf8; border:1px solid #d7e1da; border-radius:16px; padding:14px; color:#6d7a72; line-height:1.35;">
            Словарей пока нет. Создай новый словарь, и слово сразу добавится туда.
          </div>
        `;
      } else {
        dictionaries.forEach((dict) => {
          const count = (dict.words || []).length;

          const btn = document.createElement("button");
          btn.type = "button";
          btn.style.width = "100%";
          btn.style.display = "flex";
          btn.style.alignItems = "center";
          btn.style.justifyContent = "space-between";
          btn.style.gap = "12px";
          btn.style.border = "1px solid #d7e1da";
          btn.style.background = "#fbfdfb";
          btn.style.borderRadius = "16px";
          btn.style.padding = "14px 15px";
          btn.style.marginBottom = "10px";
          btn.style.textAlign = "left";
          btn.innerHTML = `
            <span style="min-width:0;">
              <span style="display:block; font-weight:800; color:#17211b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(dict.title || "Без названия")}</span>
              <span style="display:block; margin-top:3px; font-size:13px; color:#6d7a72;">${escapeHTML(dict.note || "словарь")}</span>
            </span>
            <span style="flex:0 0 auto; min-width:34px; height:34px; border-radius:999px; background:#eef5f0; color:#2f6f4b; display:inline-flex; align-items:center; justify-content:center; font-weight:800;">${count}</span>
          `;

          btn.addEventListener("click", () => finish(dict.id));

          list.appendChild(btn);
        });
      }
    }

    const closeBtn = sheet.querySelector("#dictionaryPickerCloseBtn");
    const cancelBtn = sheet.querySelector("#dictionaryPickerCancelBtn");
    const newBtn = sheet.querySelector("#dictionaryPickerNewBtn");

    if (closeBtn) closeBtn.addEventListener("click", () => finish(""));
    if (cancelBtn) cancelBtn.addEventListener("click", () => finish(""));

    if (newBtn) {
      newBtn.addEventListener("click", async () => {
        const title = prompt("Название нового словаря:", "Новый словарь");

        if (title === null) return;

        try {
          const dict = await createDictionary((title || "").trim() || "Новый словарь");
          expandedDictionaryId = dict.id;
          finish(dict.id);
        } catch (err) {
          alert("Не удалось создать словарь:\n" + err.message);
        }
      });
    }

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        finish("");
      }
    });
  });
}

function closeDictionaryPickerModal() {
  const existing = document.getElementById("dictionaryPickerOverlay");
  if (existing) {
    existing.remove();
  }
}

async function addWordCardToDictionary(dictionaryId, rawWord) {
  const dict = dictionaries.find((item) => item.id === dictionaryId);

  if (!dict) {
    throw new Error("Словарь не найден.");
  }

  const word = String(rawWord || "").trim();

  if (!word) {
    throw new Error("Пустое слово.");
  }

  const existing = (dict.words || []).find((item) => {
    return String(item.word || "").trim().toLowerCase() === word.toLowerCase();
  });

  if (existing) {
    return existing;
  }

  const wordItem = makeWordItem(word, "…", "создаю карточку…", "");

  dict.words = dict.words || [];
  dict.words.unshift(wordItem);
  dict.updatedAt = new Date().toISOString();

  saveDictionaries();

  try {
    const card = await buildShortWordCard(word);

    wordItem.word = card.word || word;
    wordItem.transcription = card.transcription || "—";
    wordItem.translation = card.translation || "перевод позже";
    wordItem.partOfSpeech = card.partOfSpeech || "";
    wordItem.updatedAt = new Date().toISOString();

    dict.updatedAt = new Date().toISOString();

    const saved = await createWordInCloudWithDictionaryRetry(dict, wordItem);
    const savedWord = saved.word ? normalizeWordFromApi(saved.word) : null;

    if (savedWord) {
      Object.assign(wordItem, savedWord);
    }

    saveDictionaries();
  } catch (err) {
    wordItem.transcription = "—";
    wordItem.translation = "перевод позже";
    wordItem.partOfSpeech = "";
    wordItem.updatedAt = new Date().toISOString();

    dict.updatedAt = new Date().toISOString();
    saveDictionaries();

    throw err;
  }

  return wordItem;
}


// ===== TEXT MODE UI =====
function iconCamera() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7.5 8.7 5.4h6.6L17 7.5h2.1c1 0 1.9.8 1.9 1.9v8.1c0 1-.8 1.9-1.9 1.9H4.9c-1 0-1.9-.8-1.9-1.9V9.4c0-1 .8-1.9 1.9-1.9H7Z"/><circle cx="12" cy="13.4" r="3.4"/></svg>`;
}

function iconMic() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14.5c2 0 3.4-1.5 3.4-3.5V6.6c0-2-1.4-3.5-3.4-3.5S8.6 4.6 8.6 6.6V11c0 2 1.4 3.5 3.4 3.5Z"/><path d="M5.7 10.8c0 3.5 2.6 6.1 6.3 6.1s6.3-2.6 6.3-6.1"/><path d="M12 16.9v4"/></svg>`;
}

function iconCopy() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 16V6.8C5 5.8 5.8 5 6.8 5H16"/></svg>`;
}

function iconClose() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5 17.5 17.5"/><path d="M17.5 6.5 6.5 17.5"/></svg>`;
}

function renderTextBottomToolbar(clearButtonId = "textInlineClearBtn") {
  return `
    <div class="text-bottom-toolbar">
      <button class="text-bottom-icon-btn text-camera-btn" type="button" title="Фото">${iconCamera()}</button>
      <button class="text-bottom-icon-btn text-mic-btn" type="button" title="Голос">${iconMic()}</button>
      <button class="text-bottom-icon-btn text-copy-btn" type="button" title="Копировать">${iconCopy()}</button>
      <button id="${clearButtonId}" class="text-bottom-icon-btn text-bottom-clear hidden" type="button" title="Очистить">${iconClose()}</button>
    </div>
  `;
}

function ensureTextModeMarkup() {
  if (!textInputBox) return;

  textInputBox.innerHTML = `
    <div class="text-mode-shell">
      <div class="text-mode-actions text-mode-actions-compact">
        <button id="textAddLexBtn" class="text-action-secondary text-add-lex-btn" type="button" disabled title="Добавить в словарь">+</button>
        <div id="textWordMiniDisplay" class="text-word-mini-display" aria-live="polite"></div>
        <button id="textTranslateBtn" class="text-action-primary text-translate-compact-btn" type="button" title="Перевести">→</button>
      </div>

      <div id="textPanelTabs" class="text-panel-tabs hidden">
        <button id="textSourceTab" class="text-panel-tab active" type="button">Оригинал</button>
        <button id="textTranslationTab" class="text-panel-tab" type="button">Перевод</button>
      </div>

      <div id="textSwipeFrame" class="text-swipe-frame">
        <div id="textSwipeTrack" class="text-swipe-track">
          <section class="text-panel" data-text-panel="source">
            <textarea id="textInput" class="text-big-input" placeholder="Вставьте текст для перевода"></textarea>
            ${renderTextBottomToolbar("textInlineClearBtn")}
          </section>

          <section class="text-panel" data-text-panel="translation">
            <div id="textTranslationOutput" class="text-translation-output">
              Перевод появится здесь.
            </div>
            ${renderTextBottomToolbar("textInlineClearBtnTranslation")}
          </section>
        </div>
      </div>

      <div id="textModeHint" class="text-mode-hint">
        После перевода появятся две панели: оригинал и перевод. Каждая панель запоминает свою позицию прокрутки.
      </div>
    </div>
  `;
}

function bindTextModeEvents() {
  const translateBtn = document.getElementById("textTranslateBtn");
  const clearBtn = document.getElementById("textClearBtn");
  const inlineClearBtn = document.getElementById("textInlineClearBtn");
  const inlineClearBtnTranslation = document.getElementById("textInlineClearBtnTranslation");
  const addLexBtn = document.getElementById("textAddLexBtn");
  const miniDisplay = document.getElementById("textWordMiniDisplay");
  const sourceTab = document.getElementById("textSourceTab");
  const translationTab = document.getElementById("textTranslationTab");
  const sourcePanel = document.querySelector('[data-text-panel="source"]');
  const translationPanel = document.querySelector('[data-text-panel="translation"]');
  const textInput = document.getElementById("textInput");

  on(translateBtn, "click", handleTextTranslate);
  on(addLexBtn, "click", addSelectedTextWordToDictionary);
  on(miniDisplay, "click", openSelectedTextWordInWordMode);
  on(clearBtn, "click", clearTextMode);
  on(inlineClearBtn, "click", clearTextMode);
  on(inlineClearBtnTranslation, "click", clearTextMode);
  on(sourceTab, "click", () => switchTextPanel("source"));
  on(translationTab, "click", () => switchTextPanel("translation"));

  on(sourcePanel, "scroll", () => {
    textPanelScroll.source = sourcePanel.scrollTop;
  });

  on(translationPanel, "scroll", () => {
    textPanelScroll.translation = translationPanel.scrollTop;
  });

  on(textInput, "input", () => {
    updateTextInlineClearVisibility();

    if (!textTranslationReady) return;
    textSourceValue = textInput.value;
  });

  updateTextInlineClearVisibility();

  bindTextSwipe();
  bindTextInlineClearButtons();
}

function bindTextSwipe() {
  const frame = document.getElementById("textSwipeFrame");
  if (!frame) return;

  let startX = 0;
  let startY = 0;
  let started = false;

  frame.addEventListener("touchstart", (event) => {
    if (!textTranslationReady || !event.touches || !event.touches.length) return;
    started = true;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  }, { passive: true });

  frame.addEventListener("touchend", (event) => {
    if (!started || !textTranslationReady || !event.changedTouches || !event.changedTouches.length) return;
    started = false;

    const dx = event.changedTouches[0].clientX - startX;
    const dy = event.changedTouches[0].clientY - startY;

    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;

    if (dx < 0) switchTextPanel("translation");
    else switchTextPanel("source");
  }, { passive: true });
}

async function handleTextTranslate() {
  const textInput = document.getElementById("textInput");
  const translateBtn = document.getElementById("textTranslateBtn");
  const source = textInput ? textInput.value.trim() : "";

  if (!source) {
    if (textInput) textInput.focus();
    return;
  }

  textSourceValue = source;
  updateTextInlineClearVisibility();
  clearSelectedTextWord();
  textTranslationReady = true;
  textActivePanel = "translation";

  const output = document.getElementById("textTranslationOutput");
  if (output) output.textContent = "Перевожу через GPT...";

  const tabs = document.getElementById("textPanelTabs");
  if (tabs) tabs.classList.remove("hidden");

  const hint = document.getElementById("textModeHint");
  if (hint) hint.textContent = "Идёт перевод текста.";

  if (translateBtn) translateBtn.disabled = true;

  switchTextPanel("translation");

  try {
    const data = await callAi("text_translate", source);
    textTranslatedValue = data.result || data.raw || "Пустой ответ.";

    renderClickableTextPanels(textSourceValue, textTranslatedValue);
    if (hint) hint.textContent = "Перевод готов. Тапни слово, затем нажми +.";
  } catch (err) {
    textTranslatedValue = "Ошибка перевода:\n" + err.message;

    if (output) output.textContent = textTranslatedValue;
    if (hint) hint.textContent = "Ошибка при переводе текста.";
  } finally {
    if (translateBtn) translateBtn.disabled = false;
  }
}

function buildTextTranslationStub(source) {
  return [
    "ПЕРЕВОД — ЗАГЛУШКА",
    "",
    "Здесь будет результат перевода текста.",
    "",
    "Оригинал сохранён в соседней панели. Можно свайпать влево/вправо или нажимать «Оригинал / Перевод».",
    "",
    "Текст, который был отправлен:",
    "",
    source
  ].join("\\n");
}

function bindTextInlineClearButtons() {
  const inlineClearBtn = document.getElementById("textInlineClearBtn");
  const inlineClearBtnTranslation = document.getElementById("textInlineClearBtnTranslation");

  if (inlineClearBtn) inlineClearBtn.onclick = clearTextMode;
  if (inlineClearBtnTranslation) inlineClearBtnTranslation.onclick = clearTextMode;

  document.querySelectorAll(".text-camera-btn, .text-mic-btn").forEach((btn) => {
    btn.onclick = () => {};
  });

  document.querySelectorAll(".text-copy-btn").forEach((btn) => {
    btn.onclick = copyActiveTextPanel;
  });
}

async function copyActiveTextPanel() {
  const textInput = document.getElementById("textInput");
  const value = textActivePanel === "translation"
    ? (textTranslatedValue || document.getElementById("textTranslationOutput")?.textContent || "")
    : (textSourceValue || textInput?.value || document.getElementById("textSourceClickableOutput")?.textContent || "");

  const clean = String(value || "").trim();

  if (!clean) return;

  try {
    await navigator.clipboard.writeText(clean);
  } catch {
    const area = document.createElement("textarea");
    area.value = clean;
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.focus();
    area.select();
    try { document.execCommand("copy"); } catch {}
    area.remove();
  }
}

function bindTextInputAfterReset() {
  const textInput = document.getElementById("textInput");

  if (!textInput) return;

  textInput.oninput = () => {
    updateTextInlineClearVisibility();

    if (!textTranslationReady) return;
    textSourceValue = textInput.value;
  };

  updateTextInlineClearVisibility();
}

function updateTextInlineClearVisibility() {
  const inlineClearBtn = document.getElementById("textInlineClearBtn");
  const inlineClearBtnTranslation = document.getElementById("textInlineClearBtnTranslation");
  const textInput = document.getElementById("textInput");

  const hasText = Boolean(
    textTranslationReady ||
    textSourceValue ||
    textTranslatedValue ||
    (textInput && textInput.value.trim())
  );

  if (inlineClearBtn) inlineClearBtn.classList.toggle("hidden", !hasText);
  if (inlineClearBtnTranslation) inlineClearBtnTranslation.classList.toggle("hidden", !hasText);
}

function renderClickableTextPanels(sourceText, translatedText) {
  const sourcePanel = document.querySelector('[data-text-panel="source"]');
  const translationPanel = document.querySelector('[data-text-panel="translation"]');

  clearSelectedTextWord();

  if (sourcePanel) {
    sourcePanel.innerHTML = `
      <div id="textSourceClickableOutput" class="text-clickable-output" data-clickable-text="source">
        ${makeClickableTextHtml(sourceText)}
      </div>
      ${renderTextBottomToolbar("textInlineClearBtn")}
    `;
  }

  if (translationPanel) {
    translationPanel.innerHTML = `
      <div id="textTranslationOutput" class="text-translation-output text-clickable-output" data-clickable-text="translation">
        ${makeClickableTextHtml(translatedText)}
      </div>
      ${renderTextBottomToolbar("textInlineClearBtnTranslation")}
    `;
  }

  bindClickableTextWords();
  bindTextInlineClearButtons();
  updateTextInlineClearVisibility();
}

function bindClickableTextWords() {
  document.querySelectorAll(".text-word-token").forEach((token) => {
    token.addEventListener("click", (event) => {
      event.stopPropagation();
      const word = token.dataset.word || token.textContent || "";
      selectTextWord(word, token);
    });
  });
}

function makeClickableTextHtml(text) {
  const value = String(text || "");
  const wordPattern = /[A-Za-zА-Яа-яЁё]+(?:[’'\\-][A-Za-zА-Яа-яЁё]+)*/gu;

  let html = "";
  let lastIndex = 0;
  let match;

  while ((match = wordPattern.exec(value)) !== null) {
    const word = match[0];

    html += escapeHTML(value.slice(lastIndex, match.index));
    html += `<span class="text-word-token" data-word="${escapeHTML(word)}">${escapeHTML(word)}</span>`;

    lastIndex = match.index + word.length;
  }

  html += escapeHTML(value.slice(lastIndex));

  return html;
}

function selectTextWord(word, element) {
  const cleanWord = String(word || "").trim();

  if (!cleanWord) return;

  if (selectedTextWordElement === element && selectedTextWord === cleanWord) {
    clearSelectedTextWord();
    return;
  }

  if (selectedTextWordElement) {
    selectedTextWordElement.classList.remove("selected");
  }

  selectedTextWord = cleanWord;
  selectedTextWordElement = element;

  if (selectedTextWordElement) {
    selectedTextWordElement.classList.add("selected");
  }

  updateTextLexButton();
  startQuickWordTranslation(cleanWord);
}

function clearSelectedTextWord() {
  if (selectedTextWordElement) {
    selectedTextWordElement.classList.remove("selected");
  }

  selectedTextWord = "";
  selectedTextWordElement = null;

  stopQuickWordTranslation();
  setTextWordMiniDisplay("");

  updateTextLexButton();
}

function updateTextLexButton(statusText = "") {
  const btn = document.getElementById("textAddLexBtn");

  if (!btn) return;

  if (statusText) {
    btn.textContent = statusText;
    return;
  }

  btn.textContent = "+";
  btn.disabled = !selectedTextWord;
  btn.classList.toggle("active", Boolean(selectedTextWord));
}

function setTextWordMiniDisplay(text, state = "") {
  const miniDisplay = document.getElementById("textWordMiniDisplay");

  if (!miniDisplay) return;

  miniDisplay.textContent = text || "";
  miniDisplay.title = text || "";
  miniDisplay.classList.toggle("loading", state === "loading");
  miniDisplay.classList.toggle("ready", state === "ready");
}

function stopQuickWordTranslation() {
  textQuickTranslateRequestId += 1;

  if (textQuickTranslateTimer) {
    clearInterval(textQuickTranslateTimer);
    textQuickTranslateTimer = null;
  }
}

function startQuickWordTranslation(word) {
  const cleanWord = String(word || "").trim();

  stopQuickWordTranslation();

  if (!cleanWord) {
    setTextWordMiniDisplay("");
    return;
  }

  const requestId = textQuickTranslateRequestId;
  let dotCount = 1;

  setTextWordMiniDisplay(".", "loading");

  textQuickTranslateTimer = setInterval(() => {
    if (requestId !== textQuickTranslateRequestId) return;

    dotCount = dotCount >= 3 ? 1 : dotCount + 1;
    setTextWordMiniDisplay(".".repeat(dotCount), "loading");
  }, 280);

  quickTranslateWord(cleanWord, requestId);
}

async function quickTranslateWord(word, requestId) {
  try {
    const data = await callAi("word_quick_translate", word);

    if (requestId !== textQuickTranslateRequestId) return;

    if (textQuickTranslateTimer) {
      clearInterval(textQuickTranslateTimer);
      textQuickTranslateTimer = null;
    }

    const result = String(data.result || data.raw || "").trim() || "—";
    const compactResult = result.split("\\n").map((line) => line.trim()).filter(Boolean)[0] || "—";

    setTextWordMiniDisplay(compactResult, "ready");
  } catch {
    if (requestId !== textQuickTranslateRequestId) return;

    if (textQuickTranslateTimer) {
      clearInterval(textQuickTranslateTimer);
      textQuickTranslateTimer = null;
    }

    setTextWordMiniDisplay("—", "ready");
  }
}

function openSelectedTextWordInWordMode() {
  const word = String(selectedTextWord || "").trim();

  if (!word) return;

  showPage("home");
  setMode("word");

  const wordInput = document.getElementById("wordInput");

  if (wordInput) {
    wordInput.value = word;
    wordInput.focus();
  }

  if (homeResultCard) {
    homeResultCard.classList.remove("hidden");
  }

  hideAddCurrentWordButton();
  showHomeResult(`Слово «${word}» перенесено из текста. Нажми «Перевести», чтобы получить полный разбор.`);
}

async function addSelectedTextWordToDictionary() {
  const word = String(selectedTextWord || "").trim();

  if (!word) return;

  const dictionaryId = await chooseDictionaryIdFromModal(word);

  if (!dictionaryId) return;

  const btn = document.getElementById("textAddLexBtn");

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Добавляю...";
  }

  try {
    await addWordCardToDictionary(dictionaryId, word);

    updateTextLexButton("✓");

    setTimeout(() => {
      clearSelectedTextWord();
    }, 700);
  } catch (err) {
    alert("Не удалось добавить слово:\\n" + err.message);
    updateTextLexButton();
  }
}


function switchTextPanel(panelName) {
  if (panelName !== "source" && panelName !== "translation") return;

  const sourcePanel = document.querySelector('[data-text-panel="source"]');
  const translationPanel = document.querySelector('[data-text-panel="translation"]');

  if (sourcePanel) textPanelScroll.source = sourcePanel.scrollTop;
  if (translationPanel) textPanelScroll.translation = translationPanel.scrollTop;

  textActivePanel = panelName;
  updateTextPanelUI();

  requestAnimationFrame(() => {
    if (sourcePanel) sourcePanel.scrollTop = textPanelScroll.source;
    if (translationPanel) translationPanel.scrollTop = textPanelScroll.translation;
  });
}

function updateTextPanelUI() {
  const track = document.getElementById("textSwipeTrack");
  const sourceTab = document.getElementById("textSourceTab");
  const translationTab = document.getElementById("textTranslationTab");

  if (track) {
    track.style.transform = textActivePanel === "translation"
      ? "translateX(-50%)"
      : "translateX(0)";
  }

  if (sourceTab) sourceTab.classList.toggle("active", textActivePanel === "source");
  if (translationTab) translationTab.classList.toggle("active", textActivePanel === "translation");
}

function clearTextMode() {
  const sourcePanel = document.querySelector('[data-text-panel="source"]');
  const translationPanel = document.querySelector('[data-text-panel="translation"]');
  const tabs = document.getElementById("textPanelTabs");
  const hint = document.getElementById("textModeHint");

  textTranslationReady = false;
  textActivePanel = "source";
  textSourceValue = "";
  textTranslatedValue = "";
  textPanelScroll.source = 0;
  textPanelScroll.translation = 0;
  clearSelectedTextWord();

  if (sourcePanel) {
    sourcePanel.innerHTML = `
      <textarea id="textInput" class="text-big-input" placeholder="Вставьте текст для перевода"></textarea>
      ${renderTextBottomToolbar("textInlineClearBtn")}
    `;
  }

  if (translationPanel) {
    translationPanel.innerHTML = `
      <div id="textTranslationOutput" class="text-translation-output">
        Перевод появится здесь.
      </div>
      ${renderTextBottomToolbar("textInlineClearBtnTranslation")}
    `;
  }

  bindTextInlineClearButtons();

  if (tabs) tabs.classList.add("hidden");

  if (hint) {
    hint.textContent = "После перевода появятся две панели: оригинал и перевод. Каждая панель запоминает свою позицию прокрутки.";
  }

  updateTextPanelUI();

  requestAnimationFrame(() => {
    const nextSourcePanel = document.querySelector('[data-text-panel="source"]');
    const nextTranslationPanel = document.querySelector('[data-text-panel="translation"]');
    const textInput = document.getElementById("textInput");

    if (nextSourcePanel) nextSourcePanel.scrollTop = 0;
    if (nextTranslationPanel) nextTranslationPanel.scrollTop = 0;

    bindTextInputAfterReset();

    if (textInput) textInput.focus();
  });
}

function syncTextModeVisibility(mode) {
  if (homeResultCard) {
    homeResultCard.classList.toggle("hidden", mode === "text");
  }

  if (mode === "text") {
    hideAddCurrentWordButton();
    updateTextPanelUI();
  } else {
    clearSelectedTextWord();
  }
}


// ===== FILES MARKUP RESTORE =====
function ensureFilesPageMarkup() {
  if (!filesPage) return;

  const hasFileUi = filesPage.querySelector("#fileInput");
  if (hasFileUi) return;

  filesPage.innerHTML = `
    <section class="page-head">
      <button id="backHomeFromFilesBtn" class="back-btn" type="button">← Назад</button>
      <h1>Файлы</h1>
    </section>

    <section class="card">
      <h1>Перевод файла</h1>
      <p class="hint">Загрузи PDF / DOCX / TXT и получи перевод через DeepL.</p>

      <label class="field">
        <span>Файл</span>
        <input id="fileInput" type="file" accept=".pdf,.doc,.docx,.pptx,.xlsx,.txt,.html" />
      </label>

      <label class="field">
        <span>Перевести на</span>
        <select id="targetLang">
          <option value="RU" selected>Русский</option>
          <option value="EN-US">English US</option>
          <option value="EN-GB">English UK</option>
          <option value="DE">Deutsch</option>
          <option value="ES">Español</option>
          <option value="FR">Français</option>
        </select>
      </label>

      <button id="uploadBtn" class="primary" type="button">Отправить в DeepL</button>
    </section>

    <section id="statusCard" class="card hidden">
      <h2>Статус</h2>
      <div id="statusText" class="status">Ожидание...</div>

      <div class="actions">
        <button id="checkBtn" type="button">Проверить статус</button>
        <button id="downloadBtn" type="button" class="hidden">Скачать перевод</button>
      </div>
    </section>

    <section class="card">
      <h2>Ручная проверка</h2>
      <p class="hint">Если файл уже отправлен, вставь document_id и document_key.</p>

      <label class="field">
        <span>document_id</span>
        <textarea id="manualId" rows="2"></textarea>
      </label>

      <label class="field">
        <span>document_key</span>
        <textarea id="manualKey" rows="3"></textarea>
      </label>

      <button id="manualCheckBtn" type="button">Проверить</button>
    </section>
  `;
}

function refreshFileElements() {
  backHomeFromFilesBtn = document.getElementById("backHomeFromFilesBtn");
  backHomeFromAiBtn = document.getElementById("backHomeFromAiBtn");
  backHomeFromLexiconBtn = document.getElementById("backHomeFromLexiconBtn");

  fileInput = document.getElementById("fileInput");
  targetLang = document.getElementById("targetLang");
  uploadBtn = document.getElementById("uploadBtn");
  statusCard = document.getElementById("statusCard");
  statusText = document.getElementById("statusText");
  checkBtn = document.getElementById("checkBtn");
  downloadBtn = document.getElementById("downloadBtn");
  manualId = document.getElementById("manualId");
  manualKey = document.getElementById("manualKey");
  manualCheckBtn = document.getElementById("manualCheckBtn");
}

// ===== NAVIGATION =====
function showPage(page) {
  hidePage(homePage);
  hidePage(filesPage);
  hidePage(aiPage);
  hidePage(lexiconPage);

  if (page === "home") showExistingPage(homePage);
  if (page === "files") showExistingPage(filesPage);
  if (page === "ai") showAiPage();
  if (page === "lexicon") showLexiconPage();
}

function hidePage(page) {
  if (!page) return;
  page.classList.add("hidden");
  page.classList.remove("active");
}

function showExistingPage(page) {
  if (!page) return;
  page.classList.remove("hidden");
  page.classList.add("active");
}

function showAiPage() {
  if (!aiPage) return;

  if (!aiPage.children.length) {
    aiPage.innerHTML = `
      <section class="page-head">
        <button id="backHomeFromAiBtn" class="back-btn" type="button">← Назад</button>
        <h1>ИИ</h1>
      </section>

      <section class="card muted-card">
        <h2>Умный режим</h2>
        <div class="status">Пока заглушка. Здесь позже будет ИИ-редактор текста и версии результата.</div>
      </section>
    `;

    backHomeFromAiBtn = document.getElementById("backHomeFromAiBtn");
    on(backHomeFromAiBtn, "click", () => showPage("home"));
  }

  showExistingPage(aiPage);
}

function showLexiconPage() {
  if (!lexiconPage) return;
  renderLexiconPage();
  showExistingPage(lexiconPage);
  bootstrapDictionaries();
}

// ===== LEXICON =====
function loadDictionaries() {
  try {
    const raw = localStorage.getItem(LEXICON_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      return parsed.map(normalizeDictionaryFromApi);
    }
  } catch {}

  return [];
}

function saveDictionaries() {
  try {
    localStorage.setItem(LEXICON_STORAGE_KEY, JSON.stringify(dictionaries));
  } catch {}
}

function makeWordItem(word, transcription = "—", translation = "перевод позже", partOfSpeech = "") {
  return {
    id: uid("word"),
    word: (word || "").toString().trim(),
    transcription,
    translation,
    partOfSpeech,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function renderLexiconPage() {
  if (!lexiconPage) return;

  const totalWords = dictionaries.reduce((sum, dict) => sum + (dict.words || []).length, 0);

  lexiconPage.innerHTML = `
    <section class="lexicon-shell">
      <div class="lexicon-topline">
        <button id="backHomeFromLexiconBtn" class="back-btn" type="button">← Назад</button>

        <div class="lexicon-title-block">
          <h1>Лексикон</h1>
          <div class="lexicon-subtitle">${dictionaries.length} словарей • ${totalWords} слов</div>
        </div>

        <div class="lexicon-actions">
          <button id="lexiconMenuBtn" class="lexicon-icon-btn" type="button" title="Меню">☰</button>
          <button id="addDictionaryBtn" class="lexicon-add-btn" type="button" title="Добавить словарь">+</button>
        </div>
      </div>

      <div class="lexicon-search-card">
        <input id="dictionarySearchInput" class="lexicon-search" type="search" placeholder="Поиск словаря или слова" />
      </div>

      <div id="dictionaryList" class="dictionary-list"></div>
    </section>
  `;

  backHomeFromLexiconBtn = document.getElementById("backHomeFromLexiconBtn");
  on(backHomeFromLexiconBtn, "click", () => showPage("home"));

  const addDictionaryBtn = document.getElementById("addDictionaryBtn");
  const lexiconMenuBtn = document.getElementById("lexiconMenuBtn");
  const dictionarySearchInput = document.getElementById("dictionarySearchInput");

  on(addDictionaryBtn, "click", addDictionary);
  on(lexiconMenuBtn, "click", () => alert("Меню пока заглушка. Потом здесь будут импорт, экспорт, настройки и режимы."));
  on(dictionarySearchInput, "input", () => renderDictionaryList(dictionarySearchInput.value));

  renderDictionaryList("");
}

function renderDictionaryList(filterText = "") {
  const list = document.getElementById("dictionaryList");
  if (!list) return;

  const query = (filterText || "").toString().trim().toLowerCase();

  const filtered = dictionaries.filter((dict) => {
    if (!query) return true;
    const titleMatch = (dict.title || "").toLowerCase().includes(query);
    const noteMatch = (dict.note || "").toLowerCase().includes(query);
    const wordMatch = (dict.words || []).some((item) =>
      [item.word, item.translation, item.transcription, item.partOfSpeech]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
    return titleMatch || noteMatch || wordMatch;
  });

  if (!filtered.length) {
    list.innerHTML = `<div class="lexicon-empty">Ничего не найдено.</div>`;
    return;
  }

  list.innerHTML = "";

  filtered.forEach((dict) => {
    const isOpen = expandedDictionaryId === dict.id;
    const wordCount = (dict.words || []).length;

    const block = document.createElement("section");
    block.className = `dictionary-block ${isOpen ? "open" : ""}`;
    block.dataset.dictionaryId = dict.id;

    block.innerHTML = `
      <button class="dictionary-line" type="button" data-dict-toggle="${dict.id}">
        <div class="dictionary-chevron">${isOpen ? "⌄" : "›"}</div>
        <div class="dictionary-line-main">
          <div class="dictionary-name">${escapeHTML(dict.title || "Без названия")}</div>
          <div class="dictionary-note">${escapeHTML(dict.note || "словарь")}</div>
        </div>
        <div class="dictionary-count">${wordCount}</div>
      </button>

      <div class="dictionary-panel ${isOpen ? "" : "hidden"}">
        <div class="dictionary-panel-head">
          <div>
            <div class="dictionary-panel-title">${escapeHTML(dict.title || "Без названия")}</div>
            <div class="dictionary-panel-subtitle">${wordCount} слов</div>
          </div>
          <div class="dictionary-panel-actions">
            <button class="small-action-btn" type="button" data-dict-rename="${dict.id}">Rename</button>
            <button class="small-action-btn danger" type="button" data-dict-delete="${dict.id}">Delete</button>
          </div>
        </div>

        <div class="dictionary-add-row">
          <input class="dictionary-word-input" data-word-input="${dict.id}" type="text" placeholder="+ Введите слово..." />
          <button class="dictionary-add-word-btn" type="button" data-word-add="${dict.id}">Ввод</button>
        </div>

        <div class="word-list" data-word-list="${dict.id}">
          ${renderWordsHtml(dict)}
        </div>
      </div>
    `;

    list.appendChild(block);
  });

  list.querySelectorAll("[data-dict-toggle]").forEach((btn) => {
    on(btn, "click", () => toggleDictionary(btn.dataset.dictToggle));
  });

  list.querySelectorAll("[data-dict-rename]").forEach((btn) => {
    on(btn, "click", (event) => {
      event.stopPropagation();
      renameDictionary(btn.dataset.dictRename);
    });
  });

  list.querySelectorAll("[data-dict-delete]").forEach((btn) => {
    on(btn, "click", (event) => {
      event.stopPropagation();
      deleteDictionary(btn.dataset.dictDelete);
    });
  });

  list.querySelectorAll("[data-word-add]").forEach((btn) => {
    on(btn, "click", () => addWordToDictionary(btn.dataset.wordAdd));
  });

  list.querySelectorAll("[data-word-input]").forEach((input) => {
    on(input, "keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addWordToDictionary(input.dataset.wordInput);
      }
    });
  });

  list.querySelectorAll("[data-word-open]").forEach((row) => {
    on(row, "click", () => openWordFromDictionary(row.dataset.wordOpen));
  });

  list.querySelectorAll("[data-word-delete]").forEach((btn) => {
    on(btn, "click", (event) => {
      event.stopPropagation();
      deleteWord(btn.dataset.wordDelete, btn.dataset.dictionaryId);
    });
  });
}

function renderWordsHtml(dict) {
  const words = dict.words || [];

  if (!words.length) {
    return `<div class="empty-word-list">Слов пока нет. Введите первое слово сверху.</div>`;
  }

  return words.map((item) => `
    <div class="word-row" data-word-open="${escapeHTML(item.word)}">
      <div class="word-main">
        <div class="word-line">
          <span class="word-text">${escapeHTML(item.word)}</span>
          ${item.partOfSpeech ? `<span class="word-pos">${escapeHTML(item.partOfSpeech)}</span>` : ""}
        </div>
        <div class="word-transcription">${escapeHTML(item.transcription || "—")}</div>
      </div>
      <div class="word-translation">${escapeHTML(item.translation || "перевод позже")}</div>
      <button class="word-delete-btn" type="button" data-dictionary-id="${dict.id}" data-word-delete="${item.id}" title="Удалить">×</button>
    </div>
  `).join("");
}

async function addDictionary() {
  const name = prompt("Название словаря:", "Новый словарь");
  if (name === null) return;

  const title = (name || "").toString().trim() || "Новый словарь";

  try {
    const dict = await createDictionary(title);

    expandedDictionaryId = dict.id;
    renderLexiconPage();
  } catch (err) {
    alert("Не удалось создать словарь:\n" + err.message);
  }
}

async function createDictionary(title) {
  const now = new Date().toISOString();

  const dict = {
    id: uid("dict"),
    title,
    note: "личный словарь",
    words: [],
    createdAt: now,
    updatedAt: now
  };

  dictionaries.unshift(dict);
  saveDictionaries();

  try {
    const data = await createDictionaryInCloud(dict);
    if (data.dictionary) {
      Object.assign(dict, normalizeDictionaryFromApi(data.dictionary));
    }
    saveDictionaries();
  } catch (err) {
    dictionaries = dictionaries.filter((item) => item.id !== dict.id);
    saveDictionaries();
    throw err;
  }

  return dict;
}

function toggleDictionary(dictionaryId) {
  if (!dictionaryId) return;
  expandedDictionaryId = expandedDictionaryId === dictionaryId ? null : dictionaryId;

  const searchInput = document.getElementById("dictionarySearchInput");
  renderDictionaryList(searchInput ? searchInput.value : "");
}

async function renameDictionary(dictionaryId) {
  const dict = dictionaries.find((item) => item.id === dictionaryId);
  if (!dict) return;

  const nextTitle = prompt("Новое название словаря:", dict.title || "");
  if (nextTitle === null) return;

  const prevTitle = dict.title;
  dict.title = (nextTitle || "").toString().trim() || "Без названия";
  dict.updatedAt = new Date().toISOString();

  saveDictionaries();
  renderLexiconPage();

  try {
    await updateDictionaryInCloud(dict);
  } catch (err) {
    dict.title = prevTitle;
    saveDictionaries();
    renderLexiconPage();
    alert("Не удалось переименовать словарь:\n" + err.message);
  }
}

async function deleteDictionary(dictionaryId) {
  const dict = dictionaries.find((item) => item.id === dictionaryId);
  if (!dict) return;

  if (!confirm(`Удалить словарь «${dict.title || "Без названия"}»?`)) return;

  const prevDictionaries = dictionaries.slice();

  dictionaries = dictionaries.filter((item) => item.id !== dictionaryId);

  if (expandedDictionaryId === dictionaryId) expandedDictionaryId = null;

  saveDictionaries();
  renderLexiconPage();

  try {
    await deleteDictionaryInCloud(dictionaryId);
  } catch (err) {
    dictionaries = prevDictionaries;
    saveDictionaries();
    renderLexiconPage();
    alert("Не удалось удалить словарь:\n" + err.message);
  }
}

async function addWordToDictionary(dictionaryId) {
  const dict = dictionaries.find((item) => item.id === dictionaryId);
  if (!dict) return;

  const input = document.querySelector(`[data-word-input="${cssEscape(dictionaryId)}"]`);
  const rawWord = input ? input.value.trim() : "";

  if (!rawWord) {
    if (input) input.focus();
    return;
  }

  if (input) input.disabled = true;

  try {
    await addWordCardToDictionary(dictionaryId, rawWord);
  } catch (err) {
    alert("Не удалось сохранить слово в облако:\n" + err.message);
  }

  renderDictionaryList(getDictionarySearchValue());

  requestAnimationFrame(() => {
    const nextInput = document.querySelector(`[data-word-input="${cssEscape(dictionaryId)}"]`);
    if (nextInput) {
      nextInput.disabled = false;
      nextInput.value = "";
      nextInput.focus();
    }
  });
}

function getDictionarySearchValue() {
  const searchInput = document.getElementById("dictionarySearchInput");
  return searchInput ? searchInput.value : "";
}

async function deleteWord(wordId, dictionaryId) {
  const dict = dictionaries.find((item) => item.id === dictionaryId);
  if (!dict) return;

  const prevWords = (dict.words || []).slice();

  dict.words = (dict.words || []).filter((item) => item.id !== wordId);
  dict.updatedAt = new Date().toISOString();

  saveDictionaries();

  const searchInput = document.getElementById("dictionarySearchInput");
  renderDictionaryList(searchInput ? searchInput.value : "");

  try {
    await deleteWordInCloud(dictionaryId, wordId);
  } catch (err) {
    dict.words = prevWords;
    saveDictionaries();
    renderDictionaryList(searchInput ? searchInput.value : "");
    alert("Не удалось удалить слово:\n" + err.message);
  }
}

function openWordFromDictionary(word) {
  if (!word) return;

  showPage("home");
  setMode("word");

  const wordInput = document.getElementById("wordInput");
  if (wordInput) {
    wordInput.value = word;
    wordInput.focus();
  }

  showHomeResult(`Слово «${word}» перенесено в поле перевода. Нажми «Перевести», чтобы получить полный разбор.`);
}

// ===== MODE SWITCH =====
function setMode(mode) {
  if (mode === "word") {
    wordModeBtn?.classList.add("active");
    textModeBtn?.classList.remove("active");
    wordInputBox?.classList.remove("hidden");
    textInputBox?.classList.add("hidden");
    syncTextModeVisibility("word");
    return;
  }

  wordModeBtn?.classList.remove("active");
  textModeBtn?.classList.add("active");
  wordInputBox?.classList.add("hidden");
  textInputBox?.classList.remove("hidden");
  syncTextModeVisibility("text");
}

function showHomeResult(text) {
  if (homeResult) homeResult.textContent = text;
}

// ===== TOKEN =====
function initAccessToken() {
  const savedToken = getAccessToken();
  if (savedToken) return;
  requestAccessToken();
}

function requestAccessToken() {
  const token = window.prompt("Введи API token для доступа:");

  if (!token || !token.trim()) {
    lockApp();
    return;
  }

  localStorage.setItem(TOKEN_STORAGE_KEY, token.trim());
}

function lockApp() {
  document.body.innerHTML = `
    <main class="app">
      <section class="card">
        <h1>Доступ закрыт</h1>
        <button id="retryTokenBtn" class="primary">Ввести токен</button>
      </section>
    </main>
  `;

  const retryTokenBtn = document.getElementById("retryTokenBtn");
  if (retryTokenBtn) {
    retryTokenBtn.onclick = () => {
      requestAccessToken();
      if (getAccessToken()) location.reload();
    };
  }
}

function getAccessToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || "";
}

function ensureAccessToken() {
  const token = getAccessToken();

  if (!token) {
    requestAccessToken();
    if (!getAccessToken()) {
      lockApp();
      return false;
    }
  }

  return true;
}

function authHeaders() {
  return {
    "Authorization": `Bearer ${getAccessToken()}`
  };
}

// ===== FILE LOGIC =====
async function uploadFile() {
  const file = fileInput?.files?.[0];

  if (!ensureAccessToken()) return;

  if (!file) {
    showStatus("Выбери файл.");
    return;
  }

  setBusy(true);
  showStatus("Отправляю файл...");

  try {
    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("target_lang", targetLang?.value || "RU");

    const res = await fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      headers: authHeaders(),
      body: formData
    });

    const data = await readJsonOrThrow(res);

    currentDocumentId = data.document_id;
    currentDocumentKey = data.document_key;

    if (manualId) manualId.value = currentDocumentId;
    if (manualKey) manualKey.value = currentDocumentKey;

    showStatus(
      "Файл отправлен.\n\n" +
      "document_id:\n" + currentDocumentId + "\n\n" +
      "document_key:\n" + currentDocumentKey
    );
  } catch (err) {
    showStatus(err.message);
  } finally {
    setBusy(false);
  }
}

async function checkManual() {
  currentDocumentId = manualId?.value?.trim() || "";
  currentDocumentKey = manualKey?.value?.trim() || "";

  if (!currentDocumentId || !currentDocumentKey) {
    showStatus("Вставь document_id и document_key.");
    return;
  }

  await checkStatus();
}

async function checkStatus() {
  if (!ensureAccessToken()) return;

  if (!currentDocumentId || !currentDocumentKey) {
    showStatus("Нет document_id/document_key.");
    return;
  }

  setBusy(true);
  showStatus("Проверяю...");

  try {
    const res = await fetch(`${API_BASE}/api/status`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        document_id: currentDocumentId,
        document_key: currentDocumentKey
      })
    });

    const data = await readJsonOrThrow(res);

    showStatus(JSON.stringify(data, null, 2));

    if (data.status === "done") downloadBtn?.classList.remove("hidden");
    else downloadBtn?.classList.add("hidden");
  } catch (err) {
    showStatus(err.message);
  } finally {
    setBusy(false);
  }
}

async function downloadResult() {
  if (!ensureAccessToken()) return;

  if (!currentDocumentId || !currentDocumentKey) {
    showStatus("Нет document_id/document_key.");
    return;
  }

  setBusy(true);
  showStatus("Скачиваю файл...");

  try {
    const res = await fetch(`${API_BASE}/api/download`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        document_id: currentDocumentId,
        document_key: currentDocumentKey
      })
    });

    if (!res.ok) throw new Error(await res.text());

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "translated.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
    showStatus("Файл скачан.");
  } catch (err) {
    showStatus(err.message);
  } finally {
    setBusy(false);
  }
}

// ===== HELPERS =====
function showStatus(text) {
  if (!statusCard || !statusText) return;
  statusCard.classList.remove("hidden");
  statusText.textContent = text;
}

function setBusy(v) {
  if (uploadBtn) uploadBtn.disabled = v;
  if (checkBtn) checkBtn.disabled = v;
  if (manualCheckBtn) manualCheckBtn.disabled = v;
  if (downloadBtn) downloadBtn.disabled = v;
}

async function readJsonOrThrow(res) {
  const text = await res.text();

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      lockApp();
      throw new Error("Unauthorized");
    }

    try {
      const data = JSON.parse(text);
      throw new Error(data.error || text || `HTTP ${res.status}`);
    } catch {
      throw new Error(text || `HTTP ${res.status}`);
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Ответ не JSON:\n" + text);
  }
}

function escapeHTML(value) {
  return (value || "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(value);
  }
  return (value || "").toString().replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}
