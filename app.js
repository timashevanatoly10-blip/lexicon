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
let textReadingRequestId = 0;
let textReadingHtml = "";
let textReadingRawValue = "";
let selectedTextWord = "";
let selectedTextWordElement = null;
let textQuickTranslateRequestId = 0;
let textQuickTranslateTimer = null;
let textCopiedPanels = [];
let textCopiedSignature = "";
let wordCopiedValue = "";
let currentWordTranslationCard = null;
let currentWordPartIndex = 0;
let wordExamplesExpanded = false;
let wordActivePanel = "center";
let wordSideRequestId = 0;
let wordLeftPanelHtml = "";
let wordRightPanelHtml = "";
let wordLeftPanelPayload = null;
let wordRightPanelPayload = null;
const textPanelScroll = {
  reading: 0,
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

ensureWordModeMarkup();
ensureTextModeMarkup();
ensureFilesPageMarkup();
refreshFileElements();
bindEvents();
initAccessToken();
ensureDictionaryPickerStyles();
retireLegacyHomeResultCard();
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

  bindWordModeEvents();
  bindTextModeEvents();
}

function on(el, eventName, handler) {
  if (el) el.addEventListener(eventName, handler);
}

function retireLegacyHomeResultCard() {
  if (homeResultCard && homeResultCard.parentNode) {
    homeResultCard.remove();
  }
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
      gap: 8px;
    }

    .text-mode-actions-compact {
      position: relative;
      display: grid;
      grid-template-columns: 45px minmax(0, 1fr) 45px;
      align-items: center;
      gap: 9px;
      width: 100%;
      min-height: 46px;
      padding: 3px 7px;
      border-radius: 24px;
      background:
        radial-gradient(circle at 50% 52%, rgba(241,244,240,0.78) 0%, rgba(248,249,246,0.90) 58%, rgba(255,255,255,0.98) 100%);
      border: 2px solid rgba(255,255,255,0.92);
      box-shadow:
        inset 0 0 0 2px rgba(255,255,255,0.46),
        inset 2px 2px 5px rgba(255,255,255,0.76),
        inset -3px -3px 7px rgba(205,214,204,0.12),
        0 2px 6px rgba(186,193,184,0.08);
    }

    .text-action-secondary,
    .text-action-primary {
      border: 0;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .text-add-lex-btn,
    .text-translate-compact-btn {
      width: 39.5px;
      min-width: 39.5px;
      height: 39.5px;
      padding: 0;
      border-radius: 999px;
      background:
        radial-gradient(circle at 50% 52%, rgba(240,243,239,0.82) 0%, rgba(249,250,247,0.92) 56%, rgba(255,255,255,0.99) 100%);
      border: 2px solid rgba(255,255,255,0.94);
      color: #5f9962;
      font-size: 26px;
      font-weight: 400;
      line-height: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow:
        inset 0 0 0 3px rgba(255,255,255,0.42),
        inset 2px 2px 5px rgba(255,255,255,0.80),
        inset -3px -3px 7px rgba(205,214,204,0.16),
        0 2px 5px rgba(186,193,184,0.08);
      transition: transform 0.12s ease, opacity 0.12s ease, box-shadow 0.12s ease;
    }

    .text-translate-compact-btn {
      font-size: 27.5px;
      padding-bottom: 3px;
    }

    .text-add-lex-btn:active,
    .text-translate-compact-btn:active,
    .text-bottom-icon-btn:active {
      transform: scale(0.96);
      box-shadow: inset 2px 2px 6px rgba(186,193,184,0.12), 0 1px 4px rgba(186,193,184,0.10);
    }

    .text-add-lex-btn:disabled { opacity: 0.62; color: #5f9962; }

    #textAddLexBtn.active {
      opacity: 1;
      color: #5f9962;
      background:
        radial-gradient(circle at 50% 52%, rgba(240,243,239,0.82) 0%, rgba(249,250,247,0.94) 56%, rgba(255,255,255,0.99) 100%);
      border-color: rgba(255,255,255,0.95);
      font-weight: 500;
    }

    .text-word-mini-display {
      min-width: 0;
      height: 38.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: 22px;
      background: transparent;
      color: #1f6f56;
      font-size: clamp(13px, 3.25vw, 18.5px);
      font-weight: 430;
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
      grid-template-columns: 1fr 1fr 1fr;
      align-items: stretch;
      gap: 0;
      background:
        radial-gradient(circle at 50% 52%, rgba(241,244,240,0.74) 0%, rgba(248,249,246,0.88) 58%, rgba(255,255,255,0.98) 100%) !important;
      padding: 1px !important;
      border: 2px solid rgba(255,255,255,0.90) !important;
      border-radius: 15px !important;
      min-height: 30px !important;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.36),
        inset 2px 2px 4px rgba(255,255,255,0.62),
        inset -2px -2px 5px rgba(205,214,204,0.08),
        0 1px 4px rgba(186,193,184,0.06);
    }

    .text-panel-tabs.hidden {
      display: none !important;
    }

    .word-panel-tabs {
      grid-template-columns: 1fr 1fr 1fr !important;
      padding: 1px !important;
      border-radius: 15px !important;
      min-height: 30px !important;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.36),
        inset 2px 2px 4px rgba(255,255,255,0.62),
        inset -2px -2px 5px rgba(205,214,204,0.08),
        0 1px 4px rgba(186,193,184,0.06) !important;
    }

    .word-panel-tab {
      min-height: 26px !important;
      height: 26px !important;
      padding: 0 6px !important;
      border-radius: 14px !important;
      font-size: clamp(10.8px, 2.45vw, 15px);
      line-height: 1 !important;
    }

    .word-panel-tab.active {
      border-radius: 14px !important;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.38),
        inset 2px 2px 4px rgba(255,255,255,0.70),
        inset -2px -2px 5px rgba(205,214,204,0.10),
        0 1px 4px rgba(186,193,184,0.055) !important;
    }

    .text-panel-tab {
      width: 100%;
      min-height: 26px;
      height: 26px;
      margin: 0 !important;
      padding: 0 6px !important;
      border: 2px solid transparent !important;
      border-radius: 14px !important;
      background: transparent !important;
      color: #777a77 !important;
      font-size: clamp(10.8px, 2.45vw, 15px);
      font-weight: 430 !important;
      letter-spacing: 0.01em;
      line-height: 1 !important;
      cursor: pointer;
      box-shadow: none !important;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .text-panel-tab.active {
      background:
        radial-gradient(circle at 50% 52%, rgba(240,243,239,0.80) 0%, rgba(249,250,247,0.94) 56%, rgba(255,255,255,0.99) 100%) !important;
      border-color: rgba(255,255,255,0.94) !important;
      color: #5f9962 !important;
      border-radius: 14px !important;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.38),
        inset 2px 2px 4px rgba(255,255,255,0.70),
        inset -2px -2px 5px rgba(205,214,204,0.10),
        0 1px 4px rgba(186,193,184,0.055) !important;
    }

    .text-swipe-frame {
      width: 100% !important;
      height: min(64dvh, 650px) !important;
      min-height: 470px !important;
      overflow: hidden !important;
      border: 2px solid rgba(255,255,255,0.76) !important;
      border-radius: 27.5px !important;
      background: rgba(250,251,248,0.94) !important;
      box-shadow:
        inset 0 0 0 2px rgba(255,255,255,0.42),
        inset 2px 2px 5px rgba(255,255,255,0.62),
        inset -2px -2px 6px rgba(197,207,196,0.12),
        0 1px 5px rgba(180,186,176,0.06) !important;
    }

    .text-swipe-track { width: 300%; height: 100%; display: flex; transition: transform 0.24s ease; transform: translateX(-33.333333%); }

    .text-panel {
      position: relative;
      width: 33.333333%;
      height: 100%;
      overflow: hidden;
      -webkit-overflow-scrolling: touch;
      background: rgba(250,251,248,0.94) !important;
      border: 0 !important;
      border-radius: 0 !important;
      padding: 0 !important;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .text-big-input,
    .text-clickable-output,
    .text-translation-output {
      width: 100%;
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      border: 0 !important;
      outline: none !important;
      box-shadow: none !important;
      background: transparent !important;
      color: #1f211f;
      padding: 23px 13px 79px !important;
      font-size: clamp(16.5px, 3.9vw, 24px);
      font-weight: 400;
      line-height: 1.4;
      letter-spacing: -0.015em;
      white-space: pre-wrap;
    }

    .text-big-input { height: auto; resize: none; }
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
      gap: 11px;
      padding: 14px 26px 17px;
      background:
        linear-gradient(to top,
          rgba(251,251,248,0.96) 0%,
          rgba(251,251,248,0.72) 56%,
          rgba(251,251,248,0.18) 86%,
          rgba(251,251,248,0) 100%);
      pointer-events: none;
    }

    .text-bottom-icon-btn {
      pointer-events: auto;
      width: 38px;
      height: 38px;
      border: 0;
      border-radius: 999px;
      background:
        radial-gradient(circle at 50% 52%, rgba(240,243,239,0.82) 0%, rgba(249,250,247,0.92) 56%, rgba(255,255,255,0.99) 100%);
      border: 2px solid rgba(255,255,255,0.94);
      color: #5f9962;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      box-shadow:
        inset 0 0 0 3px rgba(255,255,255,0.42),
        inset 2px 2px 5px rgba(255,255,255,0.78),
        inset -3px -3px 7px rgba(205,214,204,0.15),
        0 2px 5px rgba(186,193,184,0.08);
      -webkit-tap-highlight-color: transparent;
      cursor: pointer;
    }

    .text-bottom-icon-btn svg { width: 17.5px; height: 17.5px; stroke: currentColor; stroke-width: 2.3; fill: none; stroke-linecap: round; stroke-linejoin: round; }
    .text-bottom-icon-btn.text-bottom-clear svg { width: 18.5px; height: 18.5px; stroke-width: 2.45; }
    .text-bottom-icon-btn.hidden { display: none; }

    .text-bottom-icon-btn.inactive {
      opacity: 0.42;
      color: rgba(95, 153, 98, 0.58);
      filter: saturate(0.78);
    }

    .text-bottom-icon-btn.copied {
      color: #2f7d59;
      background:
        radial-gradient(circle at 50% 52%, rgba(223,237,225,0.92) 0%, rgba(244,249,243,0.96) 56%, rgba(255,255,255,0.99) 100%);
      box-shadow:
        inset 0 0 0 3px rgba(255,255,255,0.48),
        inset 2px 2px 5px rgba(255,255,255,0.82),
        inset -3px -3px 7px rgba(143,177,147,0.16),
        0 2px 5px rgba(143,177,147,0.10);
    }

    .word-panel {
      width: 100% !important;
    }

    .word-capsule-input {
      width: 100%;
      height: 38.5px;
      border: 0;
      outline: none;
      background: transparent;
      color: #1f6f56;
      font: inherit;
      font-size: clamp(13px, 3.25vw, 18.5px);
      font-weight: 430;
      line-height: 1.15;
      letter-spacing: 0.01em;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 0 6px;
    }

    .word-capsule-input::placeholder {
      color: rgba(119,122,119,0.42);
    }

    .word-result-output,
    .word-result-output.text-translation-output {
      line-height: 1.34;
      white-space: normal;
      word-break: normal;
      padding: 0 0 82px !important;
      font-size: clamp(13px, 3.05vw, 18px);
      overflow-x: hidden;
      box-sizing: border-box;
    }

    .word-result-output.empty {
      color: rgba(119,122,119,0.42);
      font-weight: 500;
      padding: 20px 11px 76px !important;
      white-space: pre-wrap;
    }

    .word-loading-note {
      color: rgba(31,33,31,0.84);
      font-size: clamp(16px, 3.7vw, 22px);
      font-weight: 520;
      line-height: 1.28;
      letter-spacing: -0.015em;
      padding: 20px 18px 76px;
      white-space: normal;
    }

    .word-card-view {
      min-height: 100%;
      display: flex;
      flex-direction: column;
      background: rgba(250,251,248,0.94);
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    .word-card-hero {
      position: sticky;
      top: 0;
      z-index: 9;
      flex: 0 0 auto;
      margin: -2px -2px 0 -2px;
      width: calc(100% + 4px);
      box-sizing: border-box;
      padding: 12px 14px 10px;
      border-radius: 27px 27px 18px 18px;
      background:
        radial-gradient(circle at 50% 52%, rgba(241,244,240,0.78) 0%, rgba(248,249,246,0.90) 58%, rgba(255,255,255,0.98) 100%);
      border: 2px solid rgba(255,255,255,0.92);
      box-shadow:
        inset 0 0 0 2px rgba(255,255,255,0.46),
        inset 2px 2px 5px rgba(255,255,255,0.76),
        inset -3px -3px 7px rgba(205,214,204,0.12),
        0 2px 6px rgba(186,193,184,0.08);
    }

    .word-card-mainline {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      min-height: 23px;
      flex-wrap: nowrap;
    }

    .word-card-title {
      color: #1f6f56;
      font-size: clamp(16px, 3.75vw, 22px);
      font-weight: 650;
      line-height: 1.05;
      letter-spacing: -0.035em;
      min-width: 0;
      max-width: 58%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .word-card-transcription {
      color: rgba(31,33,31,0.64);
      font-size: clamp(11.5px, 2.6vw, 15px);
      font-weight: 430;
      line-height: 1.05;
      letter-spacing: -0.01em;
      white-space: nowrap;
      flex: 0 0 auto;
    }

    .word-sound-btn {
      width: 22px;
      height: 22px;
      border: 0;
      background: transparent;
      color: #2f7d59;
      padding: 0;
      margin-left: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      opacity: 0.90;
      flex: 0 0 auto;
    }

    .word-sound-btn svg {
      width: 16.5px;
      height: 16.5px;
      stroke: currentColor;
      stroke-width: 2.05;
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .word-pos-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .word-pos-tab {
      border: 1px solid rgba(225,231,224,0.76);
      border-radius: 999px;
      background: rgba(255,255,255,0.72);
      color: #4d5250;
      padding: 4px 8px;
      min-width: 38px;
      min-height: 22px;
      font-size: clamp(9.5px, 2.1vw, 11.5px);
      font-weight: 620;
      line-height: 1;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.52),
        0 1px 3px rgba(180,188,178,0.035);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .word-pos-tab.active {
      color: #ffffff;
      background: #1f6f56;
      border-color: rgba(31,111,86,0.18);
      box-shadow: 0 2px 5px rgba(31,111,86,0.07);
    }

    .word-card-body {
      padding: 14px 13px 18px;
      background: rgba(255,255,255,0.54);
    }

    .word-detail-swipe-frame {
      width: 100%;
      overflow: hidden;
      background: rgba(255,255,255,0.54);
      touch-action: pan-y;
    }

    .word-detail-swipe-track {
      width: 300%;
      display: flex;
      align-items: stretch;
      transform: translateX(-33.333333%);
      transition: transform 0.24s ease;
      will-change: transform;
    }

    .word-detail-panel {
      width: 33.333333%;
      flex: 0 0 33.333333%;
      min-width: 0;
      box-sizing: border-box;
      background: rgba(255,255,255,0.54);
    }

    .word-side-placeholder {
      padding: 22px 18px 96px;
      min-height: 310px;
      color: rgba(31,33,31,0.62);
      font-size: clamp(14px, 3vw, 17px);
      line-height: 1.38;
    }

    .word-side-placeholder-title {
      color: #1f6f56;
      font-size: clamp(16px, 3.45vw, 20px);
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }

    .word-side-placeholder-text {
      max-width: 86%;
    }


    .word-side-result {
      padding: 18px 14px 96px;
      min-height: 310px;
      color: rgba(31,33,31,0.82);
      font-size: clamp(13px, 3.05vw, 17px);
      line-height: 1.38;
      white-space: pre-wrap;
      word-break: break-word;
    }



    .word-left-dashboard {
      display: flex;
      flex-direction: column;
      gap: 9px;
      padding: 11px 9px 96px;
      min-height: 310px;
      color: #1f211f;
    }

    .word-left-card {
      position: relative;
      overflow: hidden;
      border-radius: 18px;
      background:
        linear-gradient(180deg, rgba(255,255,252,0.96) 0%, rgba(248,247,241,0.94) 100%);
      border: 1px solid rgba(226,224,214,0.78);
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.52),
        inset 2px 2px 6px rgba(255,255,255,0.64),
        0 2px 8px rgba(180,170,140,0.045);
      padding: 12px 12px 12px;
    }

    .word-left-card.hero {
      background:
        radial-gradient(circle at 18% 8%, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.0) 34%),
        linear-gradient(180deg, rgba(255,255,251,0.98) 0%, rgba(247,246,238,0.95) 100%);
      border-color: rgba(222,220,207,0.82);
      padding: 14px 13px 13px;
    }

    .word-left-card.visual {
      background:
        radial-gradient(circle at 18% 10%, rgba(255,255,255,0.90) 0%, rgba(255,255,255,0) 36%),
        linear-gradient(180deg, rgba(246,249,244,0.96) 0%, rgba(239,245,238,0.92) 100%);
      border-color: rgba(95,153,98,0.14);
    }

    .word-left-topline {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 7px;
    }

    .word-left-icon {
      width: 26px;
      height: 26px;
      flex: 0 0 auto;
      border-radius: 999px;
      background: rgba(95,153,98,0.08);
      border: 1px solid rgba(95,153,98,0.14);
      color: #1f6f56;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 750;
      line-height: 1;
    }

    .word-left-label {
      color: rgba(31,33,31,0.58);
      font-size: clamp(9.5px, 2.15vw, 12px);
      font-weight: 720;
      line-height: 1;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    .word-left-main {
      color: #1f211f;
      font-size: clamp(15.5px, 3.45vw, 20px);
      font-weight: 690;
      line-height: 1.22;
      letter-spacing: -0.028em;
    }

    .word-left-text {
      color: rgba(31,33,31,0.76);
      font-size: clamp(12.2px, 2.8vw, 15.3px);
      font-weight: 440;
      line-height: 1.36;
      letter-spacing: -0.006em;
    }

    .word-left-scene {
      position: relative;
      margin-top: 2px;
      padding: 1px 0 1px 10px;
      border-left: 3px solid rgba(95,153,98,0.15);
      color: rgba(31,33,31,0.80);
      font-size: clamp(12.4px, 2.85vw, 15.6px);
      font-weight: 470;
      line-height: 1.37;
      letter-spacing: -0.008em;
    }

    .word-left-hook {
      color: #1f6f56;
      font-size: clamp(13px, 3vw, 16.5px);
      font-weight: 720;
      line-height: 1.28;
      letter-spacing: -0.014em;
    }

    .word-left-chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .word-left-chip {
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      border-radius: 999px;
      background: rgba(95,153,98,0.09);
      color: #1f6f56;
      padding: 4px 8px;
      font-size: clamp(9.7px, 2.2vw, 12.2px);
      font-weight: 650;
      line-height: 1.12;
      white-space: nowrap;
    }

    .word-left-visual-copy {
      color: rgba(31,33,31,0.62);
      font-size: clamp(11.2px, 2.55vw, 13.8px);
      line-height: 1.32;
      margin: 2px 0 10px;
    }

    .word-left-visual-btn {
      width: 100%;
      min-height: 39px;
      border: 2px solid rgba(255,255,255,0.94);
      border-radius: 999px;
      background:
        radial-gradient(circle at 50% 52%, rgba(240,243,239,0.82) 0%, rgba(249,250,247,0.94) 56%, rgba(255,255,255,0.99) 100%);
      color: #5f9962;
      font-size: clamp(12px, 2.75vw, 15px);
      font-weight: 720;
      line-height: 1;
      box-shadow:
        inset 0 0 0 3px rgba(255,255,255,0.42),
        inset 2px 2px 5px rgba(255,255,255,0.78),
        inset -3px -3px 7px rgba(205,214,204,0.15),
        0 2px 5px rgba(186,193,184,0.08);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: transform 0.12s ease, opacity 0.12s ease;
    }

    .word-left-visual-btn:active {
      transform: scale(0.98);
    }

    .word-left-visual-note {
      margin-top: 8px;
      color: rgba(31,33,31,0.54);
      font-size: clamp(10.5px, 2.35vw, 12.8px);
      line-height: 1.28;
      text-align: center;
    }


    .word-right-dashboard {
      display: flex;
      flex-direction: column;
      gap: 7px;
      padding: 10px 8px 96px;
      min-height: 310px;
      color: #1f211f;
    }

    .word-right-card {
      display: grid;
      grid-template-columns: 30px minmax(0, 1fr) auto;
      gap: 9px;
      align-items: start;
      padding: 10px 10px 10px 8px;
      border-radius: 15px;
      background: rgba(255,255,255,0.72);
      border: 1px solid rgba(226,231,224,0.74);
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.46),
        0 1px 4px rgba(180,188,178,0.035);
    }

    .word-right-card.soft {
      background: rgba(95,153,98,0.07);
      border-color: rgba(95,153,98,0.12);
    }

    .word-right-icon {
      width: 25px;
      height: 25px;
      border-radius: 999px;
      background: rgba(95,153,98,0.08);
      border: 1px solid rgba(95,153,98,0.14);
      color: #1f6f56;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      line-height: 1;
      margin-top: 1px;
    }

    .word-right-main { min-width: 0; }

    .word-right-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 5px;
    }

    .word-right-title {
      color: #1f211f;
      font-size: clamp(12px, 2.75vw, 15px);
      font-weight: 720;
      line-height: 1.15;
      letter-spacing: -0.01em;
    }

    .word-right-more {
      color: #1f6f56;
      font-size: clamp(9.5px, 2.1vw, 11.5px);
      font-weight: 650;
      white-space: nowrap;
      opacity: 0.82;
    }

    .word-right-content {
      color: rgba(31,33,31,0.74);
      font-size: clamp(11.2px, 2.55vw, 13.8px);
      font-weight: 430;
      line-height: 1.32;
      letter-spacing: -0.006em;
      word-break: normal;
    }

    .word-right-content.english {
      color: rgba(31,33,31,0.78);
      font-size: clamp(11.6px, 2.65vw, 14.2px);
    }

    .word-right-chevron {
      color: #1f6f56;
      opacity: 0.75;
      font-size: 16px;
      line-height: 1;
      padding-top: 2px;
    }

    .word-right-chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 1px;
    }

    .word-right-chip {
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      border-radius: 999px;
      background: rgba(95,153,98,0.10);
      color: #1f6f56;
      padding: 3px 7px;
      font-size: clamp(9.5px, 2.15vw, 12px);
      font-weight: 650;
      line-height: 1.15;
      white-space: nowrap;
    }

    .word-right-line-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .word-right-line strong {
      color: rgba(31,33,31,0.88);
      font-weight: 650;
    }

    .word-right-line .ru {
      color: rgba(31,33,31,0.56);
      font-style: italic;
    }

    .word-right-mistake {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .word-right-wrong {
      color: rgba(150,48,45,0.90);
      font-weight: 600;
    }

    .word-right-correct {
      color: #1f6f56;
      font-weight: 650;
    }

    .word-right-muted { color: rgba(31,33,31,0.56); }

    .word-section-title {
      color: rgba(31,33,31,0.70);
      font-size: clamp(12px, 2.75vw, 15px);
      font-weight: 650;
      line-height: 1.2;
      letter-spacing: 0.04em;
      margin: 2px 0 12px;
      padding: 0 4px;
    }

    .word-meanings-list {
      display: flex;
      flex-direction: column;
      gap: 0;
      margin: 0 0 18px;
      padding: 0;
      list-style: none;
    }

    .word-meaning-item {
      position: relative;
      display: grid;
      grid-template-columns: 22px minmax(0, 1fr);
      gap: 5px;
      padding: 0 0 12px;
      margin-bottom: 12px;
      border-bottom: 1px solid rgba(224,228,222,0.72);
      background: transparent;
      border-radius: 0;
    }

    .word-meaning-item:last-child { margin-bottom: 0; }

    .word-meaning-number {
      color: #168346;
      font-size: clamp(12.5px, 2.85vw, 16px);
      font-weight: 700;
      line-height: 1.25;
      padding-top: 1px;
      text-align: left;
    }

    .word-meaning-content { min-width: 0; }

    .word-meaning-translation {
      color: #1f211f;
      font-size: clamp(14.5px, 3.2vw, 18.5px);
      font-weight: 650;
      line-height: 1.22;
      letter-spacing: -0.015em;
    }

    .word-meaning-explanation {
      margin-top: 4px;
      color: rgba(31,33,31,0.68);
      font-size: clamp(12px, 2.75vw, 15px);
      font-weight: 430;
      line-height: 1.30;
    }

    .word-meaning-usage {
      margin-top: 6px;
      display: inline-flex;
      width: fit-content;
      max-width: 100%;
      border-radius: 999px;
      background: rgba(95,153,98,0.11);
      color: #1f6f56;
      padding: 3px 8px;
      font-size: clamp(9.5px, 2.25vw, 12px);
      font-weight: 600;
      line-height: 1.15;
    }

    .word-meaning-example {
      grid-column: 1 / -1;
      margin-top: 7px;
      padding: 6px 0 1px 8px;
      border-radius: 0;
      background: transparent;
      border: 0;
      border-left: 3px solid rgba(95,153,98,0.16);
    }

    .word-meaning-example-source {
      color: rgba(31,33,31,0.82);
      font-size: clamp(12px, 2.75vw, 14.8px);
      font-weight: 520;
      line-height: 1.28;
      letter-spacing: -0.01em;
    }

    .word-meaning-example-translation {
      margin-top: 4px;
      color: rgba(31,33,31,0.56);
      font-size: clamp(11px, 2.5vw, 13.5px);
      font-style: italic;
      line-height: 1.28;
    }

    .word-examples-block { margin-top: 12px; padding-top: 0; }

    .word-examples-list {
      display: flex;
      flex-direction: column;
      gap: 0;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .word-example-item {
      border-radius: 0;
      background: transparent;
      border: 0;
      border-bottom: 1px solid rgba(224,228,222,0.58);
      padding: 8px 4px 9px;
      box-shadow: none;
    }

    .word-example-item:last-child {
      border-bottom: 0;
    }

    .word-example-source {
      color: rgba(31,33,31,0.84);
      font-size: clamp(12.5px, 2.9vw, 16px);
      font-weight: 520;
      line-height: 1.28;
      letter-spacing: -0.01em;
    }

    .word-example-translation {
      margin-top: 4px;
      color: rgba(31,33,31,0.56);
      font-size: clamp(11.2px, 2.6vw, 14px);
      font-style: italic;
      line-height: 1.28;
    }

    .word-more-examples-btn {
      width: 100%;
      margin: 11px 0 0;
      border: 0;
      background: transparent;
      color: #168346;
      font-size: clamp(12px, 2.85vw, 15px);
      font-weight: 650;
      line-height: 1.2;
      padding: 9px 8px 5px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .word-more-examples-btn span {
      display: inline-block;
      margin-left: 6px;
      transform: translateY(-1px);
    }

    .word-empty-note {
      color: rgba(119,122,119,0.72);
      line-height: 1.4;
    }

    .word-mode-hint { display: none !important; }

    .text-reading-output {
      width: 100%;
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      padding: 19px 13px 79px !important;
      color: #1f211f;
      background: transparent;
      box-sizing: border-box;
    }

    .text-reading-title {
      color: rgba(31,33,31,0.70);
      font-size: clamp(12px, 2.75vw, 15px);
      font-weight: 650;
      line-height: 1.2;
      letter-spacing: 0.04em;
      margin: 0 0 12px;
    }

    .text-reading-lines {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .text-reading-line {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      column-gap: 7px;
      row-gap: 7px;
      line-height: 1.08;
    }

    .text-reading-token {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: flex-end;
      min-width: 0;
      max-width: 100%;
      padding: 0 2px 1px;
      border-radius: 9px;
    }

    .text-reading-token.function {
      opacity: 0.88;
    }

    .text-reading-word {
      color: rgba(31,33,31,0.90);
      font-size: clamp(15px, 3.5vw, 21px);
      font-weight: 540;
      line-height: 1.02;
      letter-spacing: -0.012em;
      white-space: nowrap;
    }

    .text-reading-ipa {
      margin: 0 0 2px;
      color: #1f6f56;
      font-size: clamp(10px, 2.25vw, 13.2px);
      font-weight: 520;
      line-height: 1.02;
      white-space: nowrap;
      opacity: 0.84;
    }

    .text-reading-punctuation {
      display: inline-flex;
      align-items: flex-end;
      color: rgba(31,33,31,0.86);
      font-size: clamp(15px, 3.5vw, 21px);
      font-weight: 540;
      line-height: 1.05;
      padding: 0 0 2px;
    }

    .text-reading-section {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid rgba(224,228,222,0.64);
    }

    .text-reading-section-title {
      color: rgba(31,33,31,0.62);
      font-size: clamp(11px, 2.5vw, 13.5px);
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: 0.04em;
      margin-bottom: 8px;
    }

    .text-reading-difficult-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }

    .text-reading-difficult-item,
    .text-reading-note-item {
      color: rgba(31,33,31,0.70);
      font-size: clamp(11.5px, 2.65vw, 14.2px);
      line-height: 1.34;
    }

    .text-reading-difficult-item strong {
      color: rgba(31,33,31,0.88);
      font-weight: 700;
    }

    .text-reading-difficult-item .ipa {
      color: #1f6f56;
      font-weight: 650;
    }

    .text-reading-placeholder {
      color: rgba(31,33,31,0.72);
      font-size: clamp(16px, 3.7vw, 22px);
      font-weight: 520;
      line-height: 1.34;
      letter-spacing: -0.015em;
      padding: 22px 13px 79px !important;
      white-space: pre-wrap;
    }

    .text-reading-placeholder small {
      display: block;
      margin-top: 10px;
      color: rgba(31,33,31,0.48);
      font-size: 0.72em;
      font-weight: 430;
      line-height: 1.35;
    }

    .text-mode-hint { display: none !important; }


    .dictionary-panel .word-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 10px;
    }

    .dictionary-panel .word-row.dictionary-word-card {
      position: relative;
      display: grid;
      grid-template-columns: 30px minmax(0, 1fr) 28px;
      align-items: start;
      gap: 8px;
      width: 100%;
      box-sizing: border-box;
      padding: 10px 9px 10px 8px;
      border-radius: 16px;
      background: rgba(255,255,255,0.72);
      border: 1px solid rgba(226,231,224,0.74);
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.46),
        0 1px 4px rgba(180,188,178,0.035);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .dictionary-panel .word-row.dictionary-word-card:active {
      transform: scale(0.995);
    }

    .dictionary-panel .word-row.dictionary-word-card.selected {
      background: rgba(95,153,98,0.08);
      border-color: rgba(95,153,98,0.22);
    }

    .dictionary-panel .word-number-badge {
      width: 25px;
      height: 25px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-top: 1px;
      background: rgba(95,153,98,0.09);
      border: 1px solid rgba(95,153,98,0.15);
      color: #1f6f56;
      font-size: clamp(10.5px, 2.35vw, 13px);
      font-weight: 760;
      line-height: 1;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.38),
        0 1px 3px rgba(180,188,178,0.035);
      user-select: none;
    }

    .dictionary-panel .word-row.dictionary-word-card.selected .word-number-badge {
      background: #1f6f56;
      border-color: rgba(31,111,86,0.22);
      color: #ffffff;
    }

    .dictionary-panel .dictionary-word-main {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .dictionary-panel .dictionary-word-line {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 6px;
      min-width: 0;
      line-height: 1.15;
    }

    .dictionary-panel .dictionary-word-text {
      color: #1f211f;
      font-size: clamp(14px, 3.2vw, 18px);
      font-weight: 720;
      line-height: 1.16;
      letter-spacing: -0.016em;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .dictionary-panel .dictionary-word-transcription {
      color: #1f6f56;
      font-size: clamp(10.5px, 2.4vw, 13.5px);
      font-weight: 560;
      line-height: 1.12;
      white-space: nowrap;
      opacity: 0.82;
    }

    .dictionary-panel .dictionary-word-pos {
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      border-radius: 999px;
      background: rgba(95,153,98,0.09);
      color: #1f6f56;
      padding: 2px 6px;
      font-size: clamp(9px, 2.05vw, 11.5px);
      font-weight: 650;
      line-height: 1.12;
      white-space: nowrap;
    }

    .dictionary-panel .dictionary-word-translation {
      color: rgba(31,33,31,0.66);
      font-size: clamp(12.2px, 2.8vw, 15.5px);
      font-weight: 450;
      line-height: 1.28;
      letter-spacing: -0.006em;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .dictionary-panel .dictionary-word-delete-btn {
      width: 26px;
      height: 26px;
      border: 0;
      border-radius: 999px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-top: 0;
      background: rgba(255,255,255,0.58);
      color: rgba(31,33,31,0.38);
      font-size: 18px;
      font-weight: 450;
      line-height: 1;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .dictionary-panel .dictionary-word-delete-btn:active {
      background: rgba(150,48,45,0.08);
      color: rgba(150,48,45,0.82);
    }

    .lexicon-shell {
      --lexi-green: #1f6f56;
      --lexi-green-soft: #5f9962;
      --lexi-surface: rgba(250,251,248,0.94);
    }

    .dictionary-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }

    .dictionary-block {
      width: 100%;
      background: transparent !important;
      border: 0 !important;
      box-shadow: none !important;
      margin: 0 !important;
      padding: 0 !important;
      border-radius: 0 !important;
      overflow: visible !important;
    }

    .dictionary-line {
      width: 100%;
      min-height: 36px !important;
      display: grid !important;
      grid-template-columns: 30px minmax(0, 1fr) 38px !important;
      align-items: center !important;
      gap: 7px !important;
      padding: 3px 9px !important;
      border-radius: 18px !important;
      border: 2px solid rgba(255,255,255,0.90) !important;
      background:
        radial-gradient(circle at 50% 52%, rgba(241,244,240,0.74) 0%, rgba(248,249,246,0.88) 58%, rgba(255,255,255,0.98) 100%) !important;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.36),
        inset 2px 2px 4px rgba(255,255,255,0.62),
        inset -2px -2px 5px rgba(205,214,204,0.08),
        0 1px 4px rgba(186,193,184,0.06) !important;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .dictionary-line:active {
      transform: scale(0.997);
    }

    .dictionary-chevron {
      width: 24px !important;
      height: 24px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      color: var(--lexi-green) !important;
      font-size: 19px !important;
      font-weight: 620 !important;
      line-height: 1 !important;
      opacity: 0.94;
    }

    .dictionary-line-main {
      min-width: 0 !important;
      display: flex !important;
      align-items: center !important;
      height: 100% !important;
    }

    .dictionary-name {
      min-width: 0 !important;
      color: #1f211f !important;
      font-size: clamp(13.2px, 3.05vw, 18px) !important;
      font-weight: 620 !important;
      line-height: 1.05 !important;
      letter-spacing: -0.014em !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    .dictionary-note {
      display: none !important;
    }

    .dictionary-count {
      justify-self: end !important;
      width: 30px !important;
      min-width: 30px !important;
      height: 30px !important;
      border-radius: 999px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      color: var(--lexi-green) !important;
      background:
        radial-gradient(circle at 50% 52%, rgba(240,243,239,0.78) 0%, rgba(249,250,247,0.90) 56%, rgba(255,255,255,0.98) 100%) !important;
      border: 1px solid rgba(255,255,255,0.78) !important;
      font-size: clamp(11px, 2.55vw, 14px) !important;
      font-weight: 720 !important;
      line-height: 1 !important;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.34),
        0 1px 3px rgba(180,188,178,0.04) !important;
    }

    .dictionary-block.open .dictionary-line {
      border-radius: 18px !important;
      margin-bottom: 8px !important;
    }

    .dictionary-block.open .dictionary-name {
      color: var(--lexi-green) !important;
      font-weight: 660 !important;
    }

    .dictionary-panel {
      width: 100% !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      margin: 0 0 8px !important;
      padding: 0 8px 12px !important;
      border-radius: 27px !important;
      background: rgba(250,251,248,0.94) !important;
      border: 2px solid rgba(255,255,255,0.76) !important;
      box-shadow:
        inset 0 0 0 2px rgba(255,255,255,0.42),
        inset 2px 2px 5px rgba(255,255,255,0.62),
        inset -2px -2px 6px rgba(197,207,196,0.12),
        0 1px 5px rgba(180,186,176,0.06) !important;
    }

    .dictionary-panel-head {
      margin: -2px -10px 10px !important;
      width: calc(100% + 20px) !important;
      box-sizing: border-box !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 12px !important;
      padding: 12px 13px 11px !important;
      border-radius: 27px 27px 18px 18px !important;
      background:
        radial-gradient(circle at 50% 52%, rgba(241,244,240,0.78) 0%, rgba(248,249,246,0.90) 58%, rgba(255,255,255,0.98) 100%) !important;
      border: 2px solid rgba(255,255,255,0.92) !important;
      box-shadow:
        inset 0 0 0 2px rgba(255,255,255,0.46),
        inset 2px 2px 5px rgba(255,255,255,0.76),
        inset -3px -3px 7px rgba(205,214,204,0.12),
        0 2px 6px rgba(186,193,184,0.08) !important;
    }

    .dictionary-panel-title {
      color: var(--lexi-green) !important;
      font-size: clamp(16px, 3.75vw, 22px) !important;
      font-weight: 650 !important;
      line-height: 1.05 !important;
      letter-spacing: -0.035em !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      max-width: 100% !important;
    }

    .dictionary-panel-subtitle {
      margin-top: 5px !important;
      color: rgba(31,33,31,0.56) !important;
      font-size: clamp(10.5px, 2.4vw, 13.5px) !important;
      font-weight: 560 !important;
      line-height: 1.1 !important;
    }

    .dictionary-panel-actions {
      flex: 0 0 auto !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 6px !important;
      align-items: flex-end !important;
    }

    .small-action-btn {
      min-height: 26px !important;
      padding: 0 10px !important;
      border-radius: 999px !important;
      border: 1px solid rgba(225,231,224,0.76) !important;
      background: rgba(255,255,255,0.72) !important;
      color: rgba(31,33,31,0.78) !important;
      font-size: clamp(10px, 2.2vw, 12px) !important;
      font-weight: 650 !important;
      line-height: 1 !important;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.52),
        0 1px 3px rgba(180,188,178,0.035) !important;
    }

    .small-action-btn.danger {
      background: rgba(255,244,246,0.82) !important;
      color: rgba(150,48,45,0.92) !important;
      border-color: rgba(255,255,255,0.76) !important;
    }

    .dictionary-add-row {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) auto !important;
      gap: 8px !important;
      align-items: center !important;
      margin: 8px 0 10px !important;
    }

    .dictionary-word-input {
      min-width: 0 !important;
      height: 42px !important;
      border-radius: 18px !important;
      border: 2px solid rgba(255,255,255,0.90) !important;
      background: rgba(255,255,255,0.68) !important;
      color: #1f211f !important;
      font-size: clamp(13px, 3vw, 17px) !important;
      font-weight: 520 !important;
      padding: 0 14px !important;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.40),
        inset 2px 2px 5px rgba(255,255,255,0.60),
        inset -2px -2px 6px rgba(197,207,196,0.10) !important;
      outline: none !important;
    }

    .dictionary-word-input::placeholder {
      color: rgba(119,122,119,0.42) !important;
    }

    .dictionary-add-word-btn {
      height: 42px !important;
      min-width: 72px !important;
      padding: 0 13px !important;
      border: 2px solid rgba(255,255,255,0.90) !important;
      border-radius: 18px !important;
      background: rgba(95,153,98,0.86) !important;
      color: #ffffff !important;
      font-size: clamp(12px, 2.85vw, 15px) !important;
      font-weight: 760 !important;
      line-height: 1 !important;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.20),
        0 2px 5px rgba(95,153,98,0.09) !important;
    }



    .lexicon-topline {
      position: relative !important;
      display: grid !important;
      grid-template-columns: 44px minmax(0, 1fr) auto !important;
      align-items: center !important;
      gap: 10px !important;
      min-height: 54px !important;
      padding: 4px 8px 6px !important;
    }

    .lexicon-topline .back-btn,
    .lexicon-back-icon-btn {
      width: 38px !important;
      min-width: 38px !important;
      height: 38px !important;
      padding: 0 !important;
      border-radius: 999px !important;
      border: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      color: var(--lexi-green) !important;
      font-size: 27px !important;
      font-weight: 500 !important;
      line-height: 1 !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      transform: translateY(-5px) !important;
    }

    .lexicon-title-block {
      min-width: 0 !important;
      text-align: left !important;
      transform: translateY(1px) !important;
    }

    .lexicon-title-block h1 {
      display: none !important;
    }

    .lexicon-subtitle {
      color: rgba(31,33,31,0.56) !important;
      font-size: clamp(13px, 3vw, 16.5px) !important;
      font-weight: 560 !important;
      line-height: 1.18 !important;
      letter-spacing: -0.01em !important;
      white-space: normal !important;
    }

    .lexicon-actions {
      display: flex !important;
      align-items: center !important;
      justify-content: flex-end !important;
      gap: 8px !important;
    }

    .lexicon-icon-btn,
    .lexicon-add-btn {
      width: 38px !important;
      min-width: 38px !important;
      height: 38px !important;
      padding: 0 !important;
      border-radius: 999px !important;
      border: 2px solid rgba(255,255,255,0.92) !important;
      background:
        radial-gradient(circle at 50% 52%, rgba(240,243,239,0.78) 0%, rgba(249,250,247,0.92) 56%, rgba(255,255,255,0.99) 100%) !important;
      color: var(--lexi-green) !important;
      box-shadow:
        inset 0 0 0 2px rgba(255,255,255,0.36),
        inset 2px 2px 4px rgba(255,255,255,0.68),
        inset -2px -2px 5px rgba(205,214,204,0.10),
        0 1px 4px rgba(186,193,184,0.055) !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      line-height: 1 !important;
    }

    .lexicon-icon-btn {
      font-size: 21px !important;
      font-weight: 520 !important;
    }

    .lexicon-add-btn {
      font-size: 30px !important;
      font-weight: 430 !important;
      padding-bottom: 3px !important;
    }

    .lexicon-search-card,
    .lexicon-search {
      display: none !important;
    }

    .dictionary-panel {
      padding: 0 8px 12px !important;
    }

    .dictionary-panel-head {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) auto auto !important;
      align-items: center !important;
      gap: 8px !important;
      padding: 8px 10px !important;
      min-height: 52px !important;
    }

    .dictionary-panel-title,
    .dictionary-panel-subtitle {
      display: none !important;
    }

    .dictionary-panel-actions {
      display: contents !important;
    }

    .dictionary-panel-menu-wrap {
      position: relative !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    .dictionary-panel-menu-btn {
      width: 38px !important;
      min-width: 38px !important;
      height: 38px !important;
      padding: 0 !important;
      border-radius: 999px !important;
      border: 2px solid rgba(255,255,255,0.92) !important;
      background:
        radial-gradient(circle at 50% 52%, rgba(240,243,239,0.78) 0%, rgba(249,250,247,0.92) 56%, rgba(255,255,255,0.99) 100%) !important;
      color: var(--lexi-green) !important;
      font-size: 22px !important;
      font-weight: 650 !important;
      line-height: 1 !important;
      box-shadow:
        inset 0 0 0 2px rgba(255,255,255,0.36),
        inset 2px 2px 4px rgba(255,255,255,0.68),
        inset -2px -2px 5px rgba(205,214,204,0.10),
        0 1px 4px rgba(186,193,184,0.055) !important;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .dictionary-add-row {
      display: contents !important;
      margin: 0 !important;
    }

    .dictionary-word-input {
      height: 38px !important;
      border-radius: 18px !important;
      padding: 0 13px !important;
      font-size: clamp(12.5px, 2.85vw, 16px) !important;
      background: rgba(255,255,255,0.58) !important;
    }

    .dictionary-add-word-btn {
      height: 38px !important;
      min-width: 64px !important;
      border-radius: 18px !important;
      padding: 0 12px !important;
      font-size: clamp(11.5px, 2.6vw, 14px) !important;
      background: rgba(95,153,98,0.78) !important;
    }

    .dictionary-menu-popover {
      position: fixed;
      z-index: 9998;
      min-width: 154px;
      border-radius: 18px;
      padding: 6px;
      background: rgba(255,255,252,0.98);
      border: 1px solid rgba(226,231,224,0.84);
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.50),
        0 12px 32px rgba(20,40,30,0.16);
      animation: dictionaryPickerRise 0.14s ease-out;
    }

    .dictionary-menu-popover button {
      width: 100%;
      min-height: 36px;
      border: 0;
      border-radius: 13px;
      background: transparent;
      color: rgba(31,33,31,0.82);
      padding: 0 11px;
      text-align: left;
      font-size: 14px;
      font-weight: 650;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .dictionary-menu-popover button:active {
      background: rgba(95,153,98,0.08);
    }

    .dictionary-menu-popover button.danger {
      color: rgba(150,48,45,0.92);
    }

    @media (max-width: 520px) {
      .text-mode-shell { gap: 8px; }
      .text-mode-actions-compact { grid-template-columns: 43px minmax(0, 1fr) 43px; min-height: 46px; gap: 7px; padding: 3px 6px; border-radius: 24px; }
      .text-add-lex-btn, .text-translate-compact-btn { width: 38px; min-width: 38px; height: 38px; font-size: 24px; }
      .text-translate-compact-btn { font-size: 26px; }
      .text-panel-tab { min-height: 26px; height: 26px; }
      .text-swipe-frame { height: min(62dvh, 620px) !important; min-height: 455px !important; border-radius: 27px !important; }
      .text-big-input, .text-clickable-output, .text-translation-output { padding: 20px 11px 76px !important; font-size: clamp(15.8px, 3.8vw, 23px); }
      .text-bottom-toolbar { padding: 13px 22px 17px; }
      .text-bottom-icon-btn { width: 37px; height: 37px; }
    }

    @media (max-width: 390px) {
      .text-mode-actions-compact { grid-template-columns: 40px minmax(0, 1fr) 40px; gap: 6px; min-height: 43px; padding-top: 2px; padding-bottom: 2px; }
      .text-add-lex-btn, .text-translate-compact-btn { width: 35px; min-width: 35px; height: 35px; font-size: 22px; }
      .text-translate-compact-btn { font-size: 24px; }
      .text-panel-tab { min-height: 25px; height: 25px; font-size: clamp(10.4px, 2.45vw, 14.5px); }
      .text-swipe-frame { height: min(61dvh, 590px) !important; min-height: 430px !important; }
      .text-bottom-toolbar { gap: 6px; padding-left: 17px; padding-right: 17px; }
      .text-bottom-icon-btn { width: 35px; height: 35px; }
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
  const translateBtn = document.getElementById("wordTranslateBtn");
  const source = wordInput ? wordInput.value.trim() : "";

  if (!source) {
    if (wordInput) wordInput.focus();
    return;
  }

  lastWordTranslateSource = source;
  wordCopiedValue = "";
  currentWordTranslationCard = null;
  currentWordPartIndex = 0;
  wordExamplesExpanded = false;
  wordActivePanel = "center";
  wordSideRequestId += 1;
  wordLeftPanelHtml = "";
  wordRightPanelHtml = "";
  wordLeftPanelPayload = null;
  wordRightPanelPayload = null;
  updateWordSwipeUI();

  if (homeResultCard) homeResultCard.classList.add("hidden");
  hideAddCurrentWordButton();
  setWordResultHtml(`<div class="word-loading-note">Думаю над переводом...</div>`, false);
  updateWordModeButtons();

  if (translateBtn) translateBtn.disabled = true;

  try {
    const data = await callAi("word_translate", source);
    const card = getStructuredWordCardFromAiData(data);

    if (card && Array.isArray(card.parts) && card.parts.length) {
      renderStructuredWordCard(card, 0);
      startWordSideRequests(card);
    } else {
      currentWordTranslationCard = null;
      currentWordPartIndex = 0;
      setWordResult(data.result || data.raw || "Пустой ответ.", false);
      updateWordSwipeUI();
    }
  } catch (err) {
    currentWordTranslationCard = null;
    currentWordPartIndex = 0;
    setWordResult("Ошибка перевода:\n" + err.message, false);
    updateWordSwipeUI();
  } finally {
    if (translateBtn) translateBtn.disabled = false;
    updateWordModeButtons();
    updateWordCopyFeedback();
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
  const word = (
    (currentWordTranslationCard ? getWordCardHeadword(currentWordTranslationCard) : "") ||
    lastWordTranslateSource ||
    document.getElementById("wordInput")?.value ||
    ""
  ).trim();

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



// ===== WORD MODE UI =====
function ensureWordModeMarkup() {
  if (!wordInputBox) return;

  wordInputBox.innerHTML = `
    <div class="text-mode-shell word-mode-shell">
      <div class="text-mode-actions text-mode-actions-compact">
        <button id="wordAddLexBtn" class="text-action-secondary text-add-lex-btn" type="button" disabled title="Добавить в словарь">+</button>
        <input id="wordInput" class="text-word-mini-display word-capsule-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Введите слово" />
        <button id="wordTranslateBtn" class="text-action-primary text-translate-compact-btn" type="button" title="Перевести">→</button>
      </div>

      <div id="wordPanelTabs" class="text-panel-tabs word-panel-tabs hidden">
        <button id="wordMemoTab" class="text-panel-tab word-panel-tab" type="button" data-word-panel-tab="left">Мнемо</button>
        <button id="wordTranslateTab" class="text-panel-tab word-panel-tab active" type="button" data-word-panel-tab="center">Перевод</button>
        <button id="wordAnalyzeTab" class="text-panel-tab word-panel-tab" type="button" data-word-panel-tab="right">Разбор</button>
      </div>

      <div id="wordSwipeFrame" class="text-swipe-frame word-swipe-frame">
        <section class="text-panel word-panel">
          <div id="wordResultOutput" class="text-translation-output word-result-output empty">Перевод появится здесь.</div>
          ${renderWordBottomToolbar()}
        </section>
      </div>

      <div id="wordModeHint" class="word-mode-hint">
        Введите слово в верхней капсуле и нажмите стрелку.
      </div>
    </div>
  `;
}

function renderWordBottomToolbar() {
  return `
    <div class="text-bottom-toolbar word-bottom-toolbar">
      <button class="text-bottom-icon-btn word-camera-btn" type="button" title="Фото">${iconCamera()}</button>
      <button class="text-bottom-icon-btn word-mic-btn" type="button" title="Голос">${iconMic()}</button>
      <button id="wordCopyBtn" class="text-bottom-icon-btn word-copy-btn" type="button" title="Копировать">${iconCopy()}</button>
      <button id="wordClearBtn" class="text-bottom-icon-btn text-bottom-clear inactive" type="button" title="Очистить">${iconClose()}</button>
    </div>
  `;
}

function bindWordModeEvents() {
  const wordInput = document.getElementById("wordInput");
  const translateBtn = document.getElementById("wordTranslateBtn");
  const addLexBtn = document.getElementById("wordAddLexBtn");
  const copyBtn = document.getElementById("wordCopyBtn");
  const clearBtn = document.getElementById("wordClearBtn");

  on(translateBtn, "click", handleWordTranslate);
  on(addLexBtn, "click", addCurrentWordTranslationToDictionary);
  on(copyBtn, "click", copyWordModeContent);

  if (clearBtn) {
    clearBtn.onclick = () => {
      if (!clearBtn.classList.contains("inactive")) clearWordMode();
    };
  }

  document.querySelectorAll(".word-camera-btn, .word-mic-btn").forEach((btn) => {
    btn.onclick = () => {};
  });

  if (wordInput) {
    wordInput.oninput = () => {
      lastWordTranslateSource = wordInput.value.trim();
      wordCopiedValue = "";
      currentWordTranslationCard = null;
      currentWordPartIndex = 0;
      wordExamplesExpanded = false;
      wordActivePanel = "center";
      wordSideRequestId += 1;
      wordLeftPanelHtml = "";
      wordRightPanelHtml = "";
      wordLeftPanelPayload = null;
      wordRightPanelPayload = null;
      updateWordSwipeUI();
      updateWordModeButtons();
      updateWordCopyFeedback();
    };

    wordInput.onkeydown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleWordTranslate();
      }
    };
  }

  bindWordSwipe();
  bindWordPanelTabs();

  updateWordModeButtons();
  updateWordCopyFeedback();
}

function getWordModeInputValue() {
  const wordInput = document.getElementById("wordInput");
  return String(wordInput?.value || lastWordTranslateSource || "").trim();
}

function getWordModeResultValue() {
  const resultOutput = document.getElementById("wordResultOutput");

  if (!resultOutput || resultOutput.classList.contains("empty")) {
    return "";
  }

  const activePanel = resultOutput.querySelector(`[data-word-swipe-panel="${wordActivePanel}"]`);

  if (activePanel) {
    return String(activePanel.innerText || "").trim();
  }

  return String(resultOutput.innerText || "").trim();
}

function getWordModeCopyValue() {
  const resultValue = getWordModeResultValue();

  if (resultValue) return resultValue;

  return getWordModeInputValue();
}

function setWordResult(text, isEmpty = false) {
  const resultOutput = document.getElementById("wordResultOutput");

  if (!resultOutput) return;

  resultOutput.textContent = text || "";
  resultOutput.classList.toggle("empty", Boolean(isEmpty));
}


function setWordResultHtml(html, isEmpty = false) {
  const resultOutput = document.getElementById("wordResultOutput");

  if (!resultOutput) return;

  resultOutput.innerHTML = html || "";
  resultOutput.classList.toggle("empty", Boolean(isEmpty));
}

function stripJsonCodeFence(value) {
  return String(value || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function parseJsonObject(value) {
  const clean = stripJsonCodeFence(value);

  if (!clean || !clean.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(clean);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function getStructuredWordCardFromAiData(data) {
  const serverCard = normalizeIncomingStructuredWordCard(data?.card);

  if (serverCard && Array.isArray(serverCard.parts) && serverCard.parts.length) {
    return serverCard;
  }

  const rawCard = normalizeIncomingStructuredWordCard(parseJsonObject(data?.raw));

  if (rawCard && Array.isArray(rawCard.parts) && rawCard.parts.length) {
    return rawCard;
  }

  const resultCard = normalizeIncomingStructuredWordCard(parseJsonObject(data?.result));

  if (resultCard && Array.isArray(resultCard.parts) && resultCard.parts.length) {
    return resultCard;
  }

  return null;
}

function normalizeIncomingStructuredWordCard(value) {
  if (!value || typeof value !== "object") return null;

  const spellcheck = value.spellcheck && typeof value.spellcheck === "object" ? value.spellcheck : {};
  const payload = value.card && typeof value.card === "object" ? value.card : value;

  const query = String(
    spellcheck.query ||
    value.query ||
    value.source_query ||
    value.sourceQuery ||
    payload.query ||
    payload.source_query ||
    payload.sourceQuery ||
    lastWordTranslateSource ||
    ""
  ).trim();

  const headword = String(
    spellcheck.corrected_headword ||
    spellcheck.correctedHeadword ||
    spellcheck.headword ||
    payload.headword ||
    payload.head_word ||
    payload.word ||
    value.headword ||
    value.head_word ||
    value.word ||
    query ||
    lastWordTranslateSource ||
    ""
  ).trim();

  const correctionNote = String(
    spellcheck.correction_note ||
    spellcheck.correctionNote ||
    value.correction_note ||
    value.correctionNote ||
    payload.correction_note ||
    payload.correctionNote ||
    ""
  ).trim();

  const detectedLanguage = String(
    spellcheck.detected_language ||
    spellcheck.detectedLanguage ||
    value.detected_language ||
    value.detectedLanguage ||
    payload.detected_language ||
    payload.detectedLanguage ||
    ""
  ).trim();

  return {
    ...payload,
    query,
    headword,
    word: headword,
    correctionNote,
    correction_note: correctionNote,
    detectedLanguage: detectedLanguage || payload.detectedLanguage || payload.detected_language || value.detectedLanguage || value.detected_language || "",
    detected_language: detectedLanguage || payload.detected_language || payload.detectedLanguage || value.detected_language || value.detectedLanguage || ""
  };
}

function getWordCardHeadword(card) {
  return String(
    card?.headword ||
    card?.head_word ||
    card?.corrected_headword ||
    card?.correctedHeadword ||
    card?.word ||
    card?.card?.headword ||
    card?.card?.word ||
    card?.spellcheck?.corrected_headword ||
    card?.spellcheck?.correctedHeadword ||
    card?.query ||
    lastWordTranslateSource ||
    ""
  ).trim();
}

function getWordCardQuery(card) {
  return String(
    card?.query ||
    card?.source_query ||
    card?.sourceQuery ||
    card?.spellcheck?.query ||
    lastWordTranslateSource ||
    getWordCardHeadword(card) ||
    ""
  ).trim();
}

function isLikelyEnglishText(value) {
  const text = String(value || "").trim();
  return Boolean(text && /[A-Za-z]/.test(text) && !/[А-Яа-яЁё]/.test(text));
}

function getWordCardParts(card) {
  return Array.isArray(card?.parts) ? card.parts.filter(Boolean) : [];
}

function getWordPartLabel(part) {
  return String(part?.labelRu || part?.label_ru || part?.label || part?.pos || "другое").trim() || "другое";
}

function getWordPartShortLabel(part) {
  return String(part?.labelShortRu || part?.label_short_ru || part?.label || getWordPartLabel(part)).trim() || getWordPartLabel(part);
}

function getWordPartEnglishLabel(part) {
  const pos = String(part?.pos || "").trim().toLowerCase();

  const map = {
    noun: "Noun",
    verb: "Verb",
    adjective: "Adjective",
    adverb: "Adverb",
    preposition: "Prep.",
    conjunction: "Conj.",
    pronoun: "Pron.",
    interjection: "Interj.",
    phrase: "Phrase",
    other: "Other"
  };

  return map[pos] || getWordPartShortLabel(part) || "Other";
}

function getWordCardTranscription(card) {
  const direct = String(
    card?.transcription ||
    card?.ipa ||
    card?.phonetic ||
    card?.pronunciation ||
    ""
  ).trim();

  if (direct) return direct;

  const query = getWordCardHeadword(card).toLowerCase();

  if (!isLikelyEnglishText(query)) return "";

  const map = {
    play: "/pleɪ/",
    run: "/rʌn/",
    go: "/ɡəʊ/",
    make: "/meɪk/",
    take: "/teɪk/",
    get: "/ɡet/",
    see: "/siː/",
    look: "/lʊk/",
    work: "/wɜːrk/",
    spring: "/sprɪŋ/",
    light: "/laɪt/"
  };

  return map[query] || "";
}

function iconSpeaker() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="M16 9c1.1 1.5 1.1 4.5 0 6"/><path d="M18.8 6.8c2.4 3 2.4 7.4 0 10.4"/></svg>`;
}

function getWordMeaningTranslation(meaning) {
  return String(meaning?.translation || meaning?.value || meaning?.meaning || "").trim();
}

function getWordMeaningExplanation(meaning) {
  return String(
    meaning?.meaning_ru ||
    meaning?.meaningRu ||
    meaning?.explanationRu ||
    meaning?.explanation_ru ||
    meaning?.note ||
    ""
  ).trim();
}

function getWordMeaningUsage(meaning) {
  const raw = String(meaning?.usageRu || meaning?.usage_ru || meaning?.usage || "").trim();
  const lower = raw.toLowerCase();
  const map = {
    common: "обычное значение",
    informal: "разговорное",
    technical: "техническое",
    figurative: "переносное",
    rare: "редкое"
  };

  return map[lower] || raw;
}

function getWordMeaningExample(meaning) {
  const example = meaning?.example || meaning?.sample || meaning?.usage_example || meaning?.usageExample || null;

  if (example && typeof example === "object") return example;

  const source = String(meaning?.example_source || meaning?.exampleSource || "").trim();
  const translationRu = String(meaning?.example_translation_ru || meaning?.exampleTranslationRu || "").trim();

  if (source || translationRu) {
    return { source, translation_ru: translationRu };
  }

  return null;
}

function getWordPartExtraExamples(part) {
  const direct = Array.isArray(part?.extra_examples)
    ? part.extra_examples
    : Array.isArray(part?.extraExamples)
      ? part.extraExamples
      : [];

  if (direct.length) return direct;

  return Array.isArray(part?.examples) ? part.examples : [];
}

function getWordExampleSource(example) {
  return String(example?.source || example?.en || example?.example || "").trim();
}

function getWordExampleTranslation(example) {
  return String(example?.translationRu || example?.translation_ru || example?.ru || "").trim();
}

function renderStructuredWordCard(card, partIndex = 0) {
  const parts = getWordCardParts(card);

  currentWordTranslationCard = card || null;
  currentWordPartIndex = Math.max(0, Math.min(Number(partIndex) || 0, Math.max(parts.length - 1, 0)));

  if (!card || !parts.length) {
    setWordResult("Пустой ответ.", false);
    return;
  }

  setWordResultHtml(buildStructuredWordCardHtml(card, currentWordPartIndex), false);
  bindWordPartTabs();
  bindWordPanelTabs();
  bindWordLeftVisualButtons();
  updateWordSwipeUI();
  updateWordModeButtons();
  updateWordCopyFeedback();
}

function buildStructuredWordCardHtml(card, partIndex = 0) {
  const parts = getWordCardParts(card);
  const safeIndex = Math.max(0, Math.min(Number(partIndex) || 0, Math.max(parts.length - 1, 0)));
  const activePart = parts[safeIndex] || parts[0] || {};
  const word = getWordCardHeadword(card);
  const transcription = getWordCardTranscription(card);

  const tabsHtml = parts.length
    ? `<div class="word-pos-tabs">
        ${parts.map((part, index) => `
          <button class="word-pos-tab ${index === safeIndex ? "active" : ""}" type="button" data-word-part-index="${index}">
            ${escapeHTML(getWordPartEnglishLabel(part))}
          </button>
        `).join("")}
      </div>`
    : "";

  const meanings = Array.isArray(activePart.meanings) ? activePart.meanings : [];
  const extraExamples = getWordPartExtraExamples(activePart);
  const visibleExamples = wordExamplesExpanded ? extraExamples : extraExamples.slice(0, 2);
  const hiddenExamplesCount = Math.max(0, extraExamples.length - visibleExamples.length);

  const meaningsHtml = meanings.length
    ? `<div class="word-section-title">Значения</div>
       <ol class="word-meanings-list">
        ${meanings.map((meaning, index) => {
          const translation = getWordMeaningTranslation(meaning);
          const explanation = getWordMeaningExplanation(meaning);
          const usage = getWordMeaningUsage(meaning);
          const example = getWordMeaningExample(meaning);
          const exampleSource = getWordExampleSource(example);
          const exampleTranslation = getWordExampleTranslation(example);

          return `
            <li class="word-meaning-item">
              <div class="word-meaning-number">${index + 1}.</div>
              <div class="word-meaning-content">
                ${translation ? `<div class="word-meaning-translation">${escapeHTML(translation)}</div>` : ""}
                ${explanation ? `<div class="word-meaning-explanation">${escapeHTML(explanation)}</div>` : ""}
                ${usage ? `<div class="word-meaning-usage">${escapeHTML(usage)}</div>` : ""}
              </div>
              ${(exampleSource || exampleTranslation) ? `
                <div class="word-meaning-example">
                  ${exampleSource ? `<div class="word-meaning-example-source">${escapeHTML(exampleSource)}</div>` : ""}
                  ${exampleTranslation ? `<div class="word-meaning-example-translation">${escapeHTML(exampleTranslation)}</div>` : ""}
                </div>
              ` : ""}
            </li>
          `;
        }).join("")}
       </ol>`
    : `<div class="word-empty-note">Значения не пришли в ответе.</div>`;

  const examplesHtml = extraExamples.length
    ? `<div class="word-examples-block">
        <div class="word-section-title">Дополнительные примеры</div>
        <ol class="word-examples-list">
          ${visibleExamples.map((example) => {
            const source = getWordExampleSource(example);
            const translation = getWordExampleTranslation(example);

            return `
              <li class="word-example-item">
                ${source ? `<div class="word-example-source">${escapeHTML(source)}</div>` : ""}
                ${translation ? `<div class="word-example-translation">${escapeHTML(translation)}</div>` : ""}
              </li>
            `;
          }).join("")}
        </ol>
        ${extraExamples.length > 2 ? `
          <button class="word-more-examples-btn" type="button" data-word-more-examples="1">
            ${wordExamplesExpanded ? "Скрыть примеры" : `Показать ещё примеры${hiddenExamplesCount ? ` (${hiddenExamplesCount})` : ""}`}
            <span>${wordExamplesExpanded ? "⌃" : "⌄"}</span>
          </button>
        ` : ""}
      </div>`
    : "";

  return `
    <div class="word-card-view">
      <div class="word-card-hero">
        <div class="word-card-mainline">
          ${word ? `<div class="word-card-title">${escapeHTML(word)}</div>` : ""}
          ${transcription ? `<div class="word-card-transcription">${escapeHTML(transcription)}</div>` : ""}
          <button class="word-sound-btn" type="button" title="Озвучить">${iconSpeaker()}</button>
        </div>
        ${tabsHtml}
      </div>

      <div class="word-detail-swipe-frame" id="wordDetailSwipeFrame">
        <div class="word-detail-swipe-track" id="wordDetailSwipeTrack">
          <section class="word-detail-panel word-detail-panel-left" data-word-swipe-panel="left">
            ${buildWordSidePanelHtml("left")}
          </section>

          <section class="word-detail-panel word-detail-panel-center" data-word-swipe-panel="center">
            <div class="word-card-body">
              ${meaningsHtml}
              ${examplesHtml}
            </div>
          </section>

          <section class="word-detail-panel word-detail-panel-right" data-word-swipe-panel="right">
            ${buildWordSidePanelHtml("right")}
          </section>
        </div>
      </div>
    </div>
  `;
}

function buildWordSidePanelHtml(side) {
  if (side === "left" && wordLeftPanelPayload) {
    return buildWordLeftDashboardHtml(wordLeftPanelPayload);
  }

  if (side === "right" && wordRightPanelPayload) {
    return buildWordRightDashboardHtml(wordRightPanelPayload);
  }

  const html = side === "left" ? wordLeftPanelHtml : wordRightPanelHtml;

  if (html) return html;

  return buildWordSidePlaceholderHtml("Думаю...");
}

function buildWordSidePlaceholderHtml(text) {
  return `
    <div class="word-side-placeholder">
      <div class="word-side-placeholder-text">${escapeHTML(text)}</div>
    </div>
  `;
}

function buildWordSideResultHtml(text) {
  const value = String(text || "").trim() || "Пустой ответ.";

  return `
    <div class="word-side-result">
      ${escapeHTML(value)}
    </div>
  `;
}

function setWordSidePanelHtml(side, html) {
  if (side !== "left" && side !== "right") return;

  if (side === "left") {
    wordLeftPanelPayload = null;
    wordLeftPanelHtml = html || "";
  } else {
    wordRightPanelPayload = null;
    wordRightPanelHtml = html || "";
  }

  const panel = document.querySelector(`[data-word-swipe-panel="${side}"]`);

  if (panel) {
    panel.innerHTML = side === "left" ? wordLeftPanelHtml : wordRightPanelHtml;
  }

  if (side === "left") {
    bindWordLeftVisualButtons();
  }

  updateWordCopyFeedback();
}

function setWordSidePanelPayload(side, payload) {
  if (side !== "left" && side !== "right") return;

  if (side === "left") {
    wordLeftPanelPayload = payload || null;
    wordLeftPanelHtml = "";
  } else {
    wordRightPanelPayload = payload || null;
    wordRightPanelHtml = "";
  }

  const panel = document.querySelector(`[data-word-swipe-panel="${side}"]`);

  if (panel) {
    panel.innerHTML = buildWordSidePanelHtml(side);
  }

  if (side === "left") {
    bindWordLeftVisualButtons();
  }

  updateWordCopyFeedback();
}

async function startWordSideRequests(card) {
  const headword = getWordCardHeadword(card);

  if (!headword) return;

  const requestId = ++wordSideRequestId;

  wordLeftPanelPayload = null;
  wordRightPanelPayload = null;

  setWordSidePanelHtml("left", buildWordSidePlaceholderHtml("Думаю..."));
  setWordSidePanelHtml("right", buildWordSidePlaceholderHtml("Думаю..."));

  loadWordSidePanel("left", "word_left", headword, requestId);
  loadWordSidePanel("right", "word_right", headword, requestId);
}

async function loadWordSidePanel(side, mode, headword, requestId) {
  try {
    const data = await callAi(mode, headword);

    if (requestId !== wordSideRequestId) return;

    if (side === "left") {
      const leftPayload = getWordLeftPayloadFromAiData(data);

      if (leftPayload) {
        setWordSidePanelPayload(side, leftPayload);
        bindWordLeftVisualButtons();
        return;
      }
    }

    if (side === "right") {
      const rightPayload = getWordRightPayloadFromAiData(data);

      if (rightPayload) {
        setWordSidePanelPayload(side, rightPayload);
        return;
      }
    }

    const result = String(data.result || data.raw || "").trim() || "Пустой ответ.";

    setWordSidePanelHtml(side, buildWordSideResultHtml(result));
  } catch (err) {
    if (requestId !== wordSideRequestId) return;

    setWordSidePanelHtml(side, buildWordSideResultHtml("Ошибка:\n" + err.message));
  }
}



function getWordLeftPayloadFromAiData(data) {
  const candidates = [
    data?.card,
    data?.payload,
    data?.left,
    data?.memory,
    parseJsonObject(data?.result),
    parseJsonObject(data?.raw)
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      return normalizeWordLeftPayload(candidate);
    }
  }

  return null;
}

function normalizeWordLeftPayload(payload) {
  if (!payload || typeof payload !== "object") return null;

  const source = payload.card && typeof payload.card === "object" ? payload.card : payload;

  const normalizeOnePart = (partSource) => {
    const part = partSource && typeof partSource === "object" ? partSource : {};

    const mnemonic = String(part.mnemonic || part.memory_hook || part.memoryHook || "").trim();
    const association = String(part.association || part.visual_association || part.visualAssociation || "").trim();
    const scene = String(part.mini_scene || part.miniScene || part.scene || part.visual_scene || part.visualScene || "").trim();
    const memoryHook = String(part.memory_hook || part.memoryHook || part.emotional_hook || part.emotionalHook || part.hook || "").trim();
    const targetMeaning = String(part.target_meaning_ru || part.targetMeaningRu || part.meaning_ru || part.meaningRu || "").trim();
    const soundHint = String(part.sound_hint_ru || part.soundHintRu || part.sound_hint || part.soundHint || "").trim();
    const contrast = String(part.contrast_ru || part.contrastRu || part.contrast || "").trim();
    const microStory = String(part.micro_story_ru || part.microStoryRu || part.micro_story || part.microStory || "").trim();
    const visualPlaceholder = String(part.visual_prompt_ru || part.visualPromptRu || part.visual_placeholder || part.visualPlaceholder || part.visual || "").trim() || "Создать образ";

    const chips = normalizeStringArray(
      part.chips ||
      part.key_images ||
      part.keyImages ||
      part.sensory_tags ||
      part.sensoryTags ||
      part.memory_chips ||
      part.memoryChips
    );

    const englishAnchorExamples = normalizeObjectArray(
      part.english_anchor_examples ||
      part.englishAnchorExamples ||
      part.anchor_examples ||
      part.anchorExamples ||
      part.examples
    );

    return {
      headword: String(part.headword || source.headword || source.word || source.query || "").trim(),
      detected_language: String(part.detected_language || part.detectedLanguage || source.detected_language || source.detectedLanguage || "").trim(),
      pos: String(part.pos || "").trim(),
      label: String(part.label || part.pos || "").trim(),
      target_meaning_ru: targetMeaning,
      mnemonic,
      association,
      scene,
      mini_scene: scene,
      memory_hook: memoryHook,
      emotional_hook: memoryHook,
      sound_hint_ru: soundHint,
      contrast_ru: contrast,
      micro_story_ru: microStory,
      visual_placeholder: visualPlaceholder,
      visual_prompt_ru: visualPlaceholder,
      chips,
      english_anchor_examples: englishAnchorExamples
    };
  };

  const rawParts = Array.isArray(source.parts) ? source.parts.filter(Boolean) : [];

  if (rawParts.length) {
    return {
      headword: String(source.headword || source.word || source.query || "").trim(),
      detected_language: String(source.detected_language || source.detectedLanguage || "").trim(),
      parts: rawParts.map(normalizeOnePart)
    };
  }

  const single = normalizeOnePart(source);
  const hasContent = Boolean(
    single.target_meaning_ru ||
    single.mnemonic ||
    single.association ||
    single.scene ||
    single.memory_hook ||
    single.sound_hint_ru ||
    single.contrast_ru ||
    single.micro_story_ru ||
    single.chips.length ||
    single.english_anchor_examples.length
  );

  return hasContent ? single : null;
}

function buildWordLeftDashboardHtml(payload) {
  const activePayload = getActiveSidePayloadPart(payload) || {};
  const blocks = [];

  blocks.push(buildWordLeftHeroCard("🧠", "Мнемоника", activePayload.mnemonic));
  blocks.push(buildWordLeftTextCard("≈", "Значение", activePayload.target_meaning_ru));
  blocks.push(buildWordLeftTextCard("◎", "Ассоциация", activePayload.association));
  blocks.push(buildWordLeftSceneCard("◐", "Мини-сцена", activePayload.mini_scene || activePayload.scene));
  blocks.push(buildWordLeftHookCard("✦", "Крючок памяти", activePayload.memory_hook || activePayload.emotional_hook));
  blocks.push(buildWordLeftTextCard("♪", "Звучание", activePayload.sound_hint_ru));
  blocks.push(buildWordLeftTextCard("⇄", "Не путать", activePayload.contrast_ru));
  blocks.push(buildWordLeftSceneCard("✎", "Мини-история", activePayload.micro_story_ru));

  if (Array.isArray(activePayload.chips) && activePayload.chips.length) {
    blocks.push(buildWordLeftChipsCard("⋯", "Образы", activePayload.chips));
  }

  blocks.push(buildWordLeftExamplesCard(activePayload.english_anchor_examples));
  blocks.push(buildWordLeftVisualCard(activePayload.visual_prompt_ru || activePayload.visual_placeholder));

  const html = blocks.filter(Boolean).join("");

  return `
    <div class="word-left-dashboard">
      ${html || `<div class="word-side-result">Пустой ответ.</div>`}
    </div>
  `;
}

function buildWordLeftCard(icon, label, contentHtml, options = {}) {
  if (!contentHtml) return "";

  return `
    <section class="word-left-card ${options.hero ? "hero" : ""} ${options.visual ? "visual" : ""}">
      <div class="word-left-topline">
        <div class="word-left-icon">${escapeHTML(icon)}</div>
        <div class="word-left-label">${escapeHTML(label)}</div>
      </div>
      ${contentHtml}
    </section>
  `;
}

function buildWordLeftHeroCard(icon, label, text) {
  const value = String(text || "").trim();
  if (!value) return "";

  return buildWordLeftCard(
    icon,
    label,
    `<div class="word-left-main">${escapeHTML(value)}</div>`,
    { hero: true }
  );
}

function buildWordLeftTextCard(icon, label, text) {
  const value = String(text || "").trim();
  if (!value) return "";

  return buildWordLeftCard(
    icon,
    label,
    `<div class="word-left-text">${escapeHTML(value)}</div>`
  );
}

function buildWordLeftSceneCard(icon, label, text) {
  const value = String(text || "").trim();
  if (!value) return "";

  return buildWordLeftCard(
    icon,
    label,
    `<div class="word-left-scene">${escapeHTML(value)}</div>`
  );
}

function buildWordLeftHookCard(icon, label, text) {
  const value = String(text || "").trim();
  if (!value) return "";

  return buildWordLeftCard(
    icon,
    label,
    `<div class="word-left-hook">${escapeHTML(value)}</div>`
  );
}

function buildWordLeftChipsCard(icon, label, items) {
  const values = compactList(normalizeStringArray(items), 8);
  if (!values.length) return "";

  return buildWordLeftCard(
    icon,
    label,
    `<div class="word-left-chip-row">${values.map((item) => `<span class="word-left-chip">${escapeHTML(item)}</span>`).join("")}</div>`
  );
}

function buildWordLeftExamplesCard(items) {
  const values = compactList(normalizeObjectArray(items), 2);
  if (!values.length) return "";

  const content = values.map((item) => {
    const source = String(item.source || item.example || item.en || item.value || item.text || "").trim();
    const translation = String(item.translation_ru || item.translationRu || item.ru || "").trim();

    if (!source && !translation) return "";

    return `
      <div class="word-right-line">
        ${source ? `<strong>${escapeHTML(source)}</strong>` : ""}
        ${translation ? `<br><span class="ru">${escapeHTML(translation)}</span>` : ""}
      </div>
    `;
  }).filter(Boolean).join("");

  if (!content) return "";

  return buildWordLeftCard(
    "A",
    "Примеры-якоря",
    `<div class="word-right-line-list">${content}</div>`
  );
}

function buildWordLeftVisualCard(label) {
  const buttonText = String(label || "").trim() || "Создать образ";

  return buildWordLeftCard(
    "▧",
    "Визуал",
    `
      <div class="word-left-visual-copy">${escapeHTML(buttonText)}</div>
      <button class="word-left-visual-btn" type="button" data-word-left-visual="1">Создать образ</button>
      <div class="word-left-visual-note">Пока это заготовка под будущую генерацию образа.</div>
    `,
    { visual: true }
  );
}



function bindWordLeftVisualButtons() {
  document.querySelectorAll("[data-word-left-visual]").forEach((btn) => {
    if (btn.dataset.bound === "1") return;

    btn.dataset.bound = "1";
    btn.onclick = () => {
      btn.textContent = "Скоро добавим";
      btn.disabled = true;
      btn.style.opacity = "0.68";
    };
  });
}



function normalizeWordPartKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/\s+/g, " ");
}

function getCurrentWordPartForSidePanels() {
  const parts = getWordCardParts(currentWordTranslationCard);
  return parts[currentWordPartIndex] || parts[0] || null;
}

function getActiveSidePayloadPart(payload) {
  if (!payload || typeof payload !== "object") return payload;

  const sideParts = Array.isArray(payload.parts) ? payload.parts.filter(Boolean) : [];

  if (!sideParts.length) return payload;

  const centerPart = getCurrentWordPartForSidePanels();
  const centerPos = normalizeWordPartKey(centerPart?.pos);
  const centerLabel = normalizeWordPartKey(getWordPartEnglishLabel(centerPart));
  const centerShortLabel = normalizeWordPartKey(getWordPartShortLabel(centerPart));
  const centerRuLabel = normalizeWordPartKey(getWordPartLabel(centerPart));

  const matches = (part) => {
    const partPos = normalizeWordPartKey(part?.pos);
    const partLabel = normalizeWordPartKey(part?.label);
    const partShort = normalizeWordPartKey(part?.label_short || part?.labelShort || part?.labelShortRu || part?.label_short_ru);

    return Boolean(
      (centerPos && partPos && centerPos === partPos) ||
      (centerLabel && partLabel && centerLabel === partLabel) ||
      (centerShortLabel && partShort && centerShortLabel === partShort) ||
      (centerRuLabel && partLabel && centerRuLabel === partLabel)
    );
  };

  const matched = sideParts.find(matches);

  if (matched) return matched;

  const byIndex = sideParts[currentWordPartIndex];

  return byIndex || sideParts[0] || payload;
}

function getWordRightPayloadFromAiData(data) {
  const candidates = [
    data?.card,
    data?.payload,
    data?.right,
    parseJsonObject(data?.result),
    parseJsonObject(data?.raw)
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      return normalizeWordRightPayload(candidate);
    }
  }

  return null;
}

function normalizeWordRightPayload(payload) {
  if (!payload || typeof payload !== "object") return null;

  const source = payload.card && typeof payload.card === "object" ? payload.card : payload;

  const normalizeOnePart = (partSource) => {
    const part = partSource && typeof partSource === "object" ? partSource : {};

    return {
      headword: String(part.headword || source.headword || source.word || source.query || "").trim(),
      detected_language: String(part.detected_language || part.detectedLanguage || source.detected_language || source.detectedLanguage || "").trim(),
      pos: String(part.pos || "").trim(),
      label: String(part.label || part.pos || "").trim(),
      pos_focus: String(part.pos_focus || part.posFocus || part.pos || source.pos_focus || source.posFocus || "").trim(),
      english_definition: String(part.english_definition || part.englishDefinition || part.definition || "").trim(),
      semantic_core: normalizeStringArray(part.semantic_core || part.semanticCore || part.core),
      synonyms: normalizeStringArray(part.synonyms),
      antonyms: normalizeStringArray(part.antonyms),
      collocations: normalizeObjectArray(part.collocations),
      grammar_patterns: normalizeObjectArray(part.grammar_patterns || part.grammarPatterns),
      usage_notes: normalizeStringArray(part.usage_notes || part.usageNotes),
      common_mistakes: normalizeObjectArray(part.common_mistakes || part.commonMistakes),
      phrases: normalizeObjectArray(part.phrases || part.expressions || part.idioms),
      word_family: normalizeObjectArray(part.word_family || part.wordFamily),
      etymology: String(part.etymology || "").trim(),
      level_frequency: part.level_frequency && typeof part.level_frequency === "object"
        ? part.level_frequency
        : part.levelFrequency && typeof part.levelFrequency === "object"
          ? part.levelFrequency
          : {},
      advice_ru: String(part.advice_ru || part.adviceRu || part.advice || "").trim()
    };
  };

  const rawParts = Array.isArray(source.parts) ? source.parts.filter(Boolean) : [];

  if (rawParts.length) {
    return {
      headword: String(source.headword || source.word || source.query || "").trim(),
      detected_language: String(source.detected_language || source.detectedLanguage || "").trim(),
      parts: rawParts.map(normalizeOnePart)
    };
  }

  return normalizeOnePart(source);
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    const text = String(value || "").trim();
    return text ? [text] : [];
  }

  return value
    .map((item) => {
      if (item && typeof item === "object") {
        return String(item.word || item.phrase || item.value || item.text || item.note || "").trim();
      }
      return String(item || "").trim();
    })
    .filter(Boolean);
}

function normalizeObjectArray(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (item && typeof item === "object") return item;

      const text = String(item || "").trim();
      return text ? { value: text } : null;
    })
    .filter(Boolean);
}

function compactList(items, limit = 6) {
  return (Array.isArray(items) ? items : []).slice(0, limit);
}

function buildWordRightDashboardHtml(payload) {
  const activePayload = getActiveSidePayloadPart(payload) || {};
  const blocks = [];

  blocks.push(buildWordRightTextCard("📖", "Английское объяснение", activePayload.english_definition, { english: true }));
  blocks.push(buildWordRightCollocationsCard(activePayload.collocations));
  blocks.push(buildWordRightGrammarCard(activePayload.grammar_patterns));
  blocks.push(buildWordRightListCard("☞", "Примечания по употреблению", activePayload.usage_notes));
  blocks.push(buildWordRightMistakesCard(activePayload.common_mistakes));
  blocks.push(buildWordRightPhrasesCard(activePayload.phrases));
  blocks.push(buildWordRightWordFamilyCard(activePayload.word_family));
  blocks.push(buildWordRightTextCard("◌", "Этимология", activePayload.etymology));
  blocks.push(buildWordRightLevelCard(activePayload.level_frequency));
  blocks.push(buildWordRightTextCard("✦", "Совет", activePayload.advice_ru, { soft: true }));
  blocks.push(buildWordRightChipCard("◎", "Смысловое ядро", activePayload.semantic_core));
  blocks.push(buildWordRightChipCard("↔", "Синонимы", activePayload.synonyms, { more: activePayload.synonyms.length > 6 }));
  blocks.push(buildWordRightChipCard("⇄", "Антонимы", activePayload.antonyms, { more: activePayload.antonyms.length > 6 }));

  const html = blocks.filter(Boolean).join("");

  return `
    <div class="word-right-dashboard">
      ${html || `<div class="word-side-result">Пустой ответ.</div>`}
    </div>
  `;
}

function buildWordRightCard(icon, title, contentHtml, options = {}) {
  if (!contentHtml) return "";

  return `
    <section class="word-right-card ${options.soft ? "soft" : ""}">
      <div class="word-right-icon">${escapeHTML(icon)}</div>
      <div class="word-right-main">
        <div class="word-right-title-row">
          <div class="word-right-title">${escapeHTML(title)}</div>
          ${options.more ? `<div class="word-right-more">Показать все</div>` : ""}
        </div>
        ${contentHtml}
      </div>
      <div class="word-right-chevron">⌄</div>
    </section>
  `;
}

function buildWordRightTextCard(icon, title, text, options = {}) {
  const value = String(text || "").trim();
  if (!value) return "";

  return buildWordRightCard(
    icon,
    title,
    `<div class="word-right-content ${options.english ? "english" : ""}">${escapeHTML(value)}</div>`,
    options
  );
}

function buildWordRightChipCard(icon, title, items, options = {}) {
  const values = compactList(normalizeStringArray(items), 6);
  if (!values.length) return "";

  return buildWordRightCard(
    icon,
    title,
    `<div class="word-right-chip-row">${values.map((item) => `<span class="word-right-chip">${escapeHTML(item)}</span>`).join("")}</div>`,
    options
  );
}

function buildWordRightListCard(icon, title, items, options = {}) {
  const values = compactList(normalizeStringArray(items), 4);
  if (!values.length) return "";

  return buildWordRightCard(
    icon,
    title,
    `<div class="word-right-line-list">${values.map((item) => `<div class="word-right-line">${escapeHTML(item)}</div>`).join("")}</div>`,
    options
  );
}

function buildWordRightCollocationsCard(items) {
  const values = compactList(normalizeObjectArray(items), 5);
  if (!values.length) return "";

  const content = values.map((item) => {
    const phrase = String(item.phrase || item.value || item.text || "").trim();
    const translation = String(item.translation_ru || item.translationRu || item.ru || "").trim();

    if (!phrase && !translation) return "";

    return `<div class="word-right-line"><strong>${escapeHTML(phrase)}</strong>${translation ? ` <span class="ru">— ${escapeHTML(translation)}</span>` : ""}</div>`;
  }).filter(Boolean).join("");

  return buildWordRightCard("⛓", "Типичные сочетания", `<div class="word-right-line-list">${content}</div>`, { more: items.length > 5 });
}

function buildWordRightGrammarCard(items) {
  const values = compactList(normalizeObjectArray(items), 4);
  if (!values.length) return "";

  const content = values.map((item) => {
    const pattern = String(item.pattern || item.value || item.text || "").trim();
    const example = String(item.example || item.source || "").trim();
    const translation = String(item.translation_ru || item.translationRu || item.ru || "").trim();

    if (!pattern && !example && !translation) return "";

    return `<div class="word-right-line"><strong>${escapeHTML(pattern)}</strong>${example ? `<br>${escapeHTML(example)}` : ""}${translation ? `<br><span class="ru">${escapeHTML(translation)}</span>` : ""}</div>`;
  }).filter(Boolean).join("");

  return buildWordRightCard("▣", "Грамматические конструкции", `<div class="word-right-line-list">${content}</div>`, { more: items.length > 4 });
}

function buildWordRightMistakesCard(items) {
  const values = compactList(normalizeObjectArray(items), 3);
  if (!values.length) return "";

  const content = values.map((item) => {
    const wrong = String(item.wrong || item.incorrect || "").trim();
    const correct = String(item.correct || item.right || "").trim();
    const note = String(item.note_ru || item.noteRu || item.note || "").trim();

    if (!wrong && !correct && !note) return "";

    return `
      <div class="word-right-mistake">
        ${wrong ? `<div class="word-right-wrong">✕ ${escapeHTML(wrong)}</div>` : ""}
        ${correct ? `<div class="word-right-correct">✓ ${escapeHTML(correct)}</div>` : ""}
        ${note ? `<div class="word-right-muted">${escapeHTML(note)}</div>` : ""}
      </div>
    `;
  }).filter(Boolean).join("");

  return buildWordRightCard("!", "Типичные ошибки", `<div class="word-right-line-list">${content}</div>`, { more: items.length > 3 });
}

function buildWordRightPhrasesCard(items) {
  const values = compactList(normalizeObjectArray(items), 5);
  if (!values.length) return "";

  const content = values.map((item) => {
    const phrase = String(item.phrase || item.value || item.text || "").trim();
    const translation = String(item.translation_ru || item.translationRu || item.ru || "").trim();
    const example = String(item.example || item.source || "").trim();

    if (!phrase && !translation && !example) return "";

    return `<div class="word-right-line"><strong>${escapeHTML(phrase)}</strong>${translation ? ` <span class="ru">— ${escapeHTML(translation)}</span>` : ""}${example ? `<br>${escapeHTML(example)}` : ""}</div>`;
  }).filter(Boolean).join("");

  return buildWordRightCard("◇", "Фразовые глаголы и выражения", `<div class="word-right-line-list">${content}</div>`, { more: items.length > 5 });
}

function buildWordRightWordFamilyCard(items) {
  const values = compactList(normalizeObjectArray(items), 6);
  if (!values.length) return "";

  const content = values.map((item) => {
    const word = String(item.word || item.value || item.text || "").trim();
    const translation = String(item.translation_ru || item.translationRu || item.ru || "").trim();

    if (!word && !translation) return "";

    return `<div class="word-right-line"><strong>${escapeHTML(word)}</strong>${translation ? ` <span class="ru">— ${escapeHTML(translation)}</span>` : ""}</div>`;
  }).filter(Boolean).join("");

  return buildWordRightCard("☷", "Родственные слова", `<div class="word-right-line-list">${content}</div>`, { more: items.length > 6 });
}

function buildWordRightLevelCard(levelFrequency) {
  const source = levelFrequency && typeof levelFrequency === "object" ? levelFrequency : {};
  const cefr = String(source.cefr || "").trim();
  const frequency = String(source.frequency || "").trim();

  if (!cefr && !frequency) return "";

  const chips = [frequency, cefr].filter(Boolean);

  return buildWordRightCard(
    "▥",
    "Частотность и уровень",
    `<div class="word-right-chip-row">${chips.map((item) => `<span class="word-right-chip">${escapeHTML(item)}</span>`).join("")}</div>`
  );
}

function bindWordPanelTabs() {
  document.querySelectorAll("[data-word-panel-tab]").forEach((btn) => {
    if (btn.dataset.bound === "1") return;

    btn.dataset.bound = "1";
    btn.onclick = () => switchWordPanel(btn.dataset.wordPanelTab || "center");
  });
}

function updateWordPanelTabsVisibility() {
  const tabs = document.getElementById("wordPanelTabs");

  if (!tabs) return;

  tabs.classList.toggle("hidden", !currentWordTranslationCard);
}

function updateWordPanelTabsUI() {
  document.querySelectorAll("[data-word-panel-tab]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.wordPanelTab === wordActivePanel);
  });
}

function switchWordPanel(panelName) {
  if (!["left", "center", "right"].includes(panelName)) return;

  wordActivePanel = panelName;
  updateWordSwipeUI();
  updateWordCopyFeedback();
}

function updateWordSwipeUI() {
  updateWordPanelTabsVisibility();
  updateWordPanelTabsUI();

  const track = document.getElementById("wordDetailSwipeTrack");

  if (!track) return;

  const offsets = {
    left: "0%",
    center: "-33.333333%",
    right: "-66.666666%"
  };

  track.style.transform = `translateX(${offsets[wordActivePanel] || offsets.center})`;
}

function bindWordSwipe() {
  const frame = document.getElementById("wordSwipeFrame");

  if (!frame || frame.dataset.wordSwipeBound === "1") return;

  frame.dataset.wordSwipeBound = "1";

  let startX = 0;
  let startY = 0;
  let started = false;

  frame.addEventListener("touchstart", (event) => {
    if (!currentWordTranslationCard || !event.touches || !event.touches.length) return;

    started = true;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  }, { passive: true });

  frame.addEventListener("touchend", (event) => {
    if (!started || !currentWordTranslationCard || !event.changedTouches || !event.changedTouches.length) return;

    started = false;

    const dx = event.changedTouches[0].clientX - startX;
    const dy = event.changedTouches[0].clientY - startY;

    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;

    if (dx < 0) {
      if (wordActivePanel === "left") switchWordPanel("center");
      else if (wordActivePanel === "center") switchWordPanel("right");
    } else {
      if (wordActivePanel === "right") switchWordPanel("center");
      else if (wordActivePanel === "center") switchWordPanel("left");
    }
  }, { passive: true });
}

function bindWordPartTabs() {
  document.querySelectorAll("[data-word-part-index]").forEach((btn) => {
    btn.onclick = () => {
      const index = Number(btn.dataset.wordPartIndex || "0");

      if (!currentWordTranslationCard) return;

      wordCopiedValue = "";
      wordExamplesExpanded = false;
      renderStructuredWordCard(currentWordTranslationCard, index);
    };
  });

  document.querySelectorAll("[data-word-more-examples]").forEach((btn) => {
    btn.onclick = () => {
      if (!currentWordTranslationCard) return;

      wordCopiedValue = "";
      wordExamplesExpanded = !wordExamplesExpanded;
      renderStructuredWordCard(currentWordTranslationCard, currentWordPartIndex);
    };
  });

  document.querySelectorAll(".word-sound-btn").forEach((btn) => {
    btn.onclick = () => {};
  });
}


function clearWordMode() {
  const wordInput = document.getElementById("wordInput");

  lastWordTranslateSource = "";
  wordCopiedValue = "";
  currentWordTranslationCard = null;
  currentWordPartIndex = 0;
  wordExamplesExpanded = false;
  wordActivePanel = "center";
  wordSideRequestId += 1;
  wordLeftPanelHtml = "";
  wordRightPanelHtml = "";
  wordLeftPanelPayload = null;
  wordRightPanelPayload = null;

  if (wordInput) {
    wordInput.value = "";
    wordInput.focus();
  }

  setWordResult("Перевод появится здесь.", true);
  hideAddCurrentWordButton();
  updateWordSwipeUI();
  updateWordModeButtons();
  updateWordCopyFeedback();

  if (homeResultCard) homeResultCard.classList.add("hidden");
}

function updateWordModeButtons() {
  const addLexBtn = document.getElementById("wordAddLexBtn");
  const clearBtn = document.getElementById("wordClearBtn");

  const inputValue = getWordModeInputValue();
  const resultValue = getWordModeResultValue();
  const hasWord = Boolean(inputValue);
  const hasAnything = Boolean(inputValue || resultValue);

  if (addLexBtn) {
    addLexBtn.textContent = "+";
    addLexBtn.disabled = !hasWord;
    addLexBtn.classList.toggle("active", hasWord);
  }

  if (clearBtn) {
    clearBtn.classList.toggle("inactive", !hasAnything);
  }
}

async function copyWordModeContent() {
  const value = getWordModeCopyValue().trim();

  if (!value) return;

  const copied = await writeTextToClipboard(value);

  if (copied) {
    wordCopiedValue = value;
    updateWordCopyFeedback();
  }
}

function updateWordCopyFeedback() {
  const copyBtn = document.getElementById("wordCopyBtn");

  if (!copyBtn) return;

  const value = getWordModeCopyValue().trim();
  const isCopied = Boolean(value && wordCopiedValue && value === wordCopiedValue);

  copyBtn.classList.toggle("copied", isCopied);
  copyBtn.innerHTML = isCopied ? iconCheck() : iconCopy();
  copyBtn.title = isCopied ? "Скопировано" : "Копировать";
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

function iconCheck() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.6 12.4 10 16.8 18.6 7.2"/></svg>`;
}

function iconClose() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5 17.5 17.5"/><path d="M17.5 6.5 6.5 17.5"/></svg>`;
}

function renderTextBottomToolbar(clearButtonId = "textInlineClearBtn", panelName = "source") {
  return `
    <div class="text-bottom-toolbar">
      <button class="text-bottom-icon-btn text-camera-btn" type="button" title="Фото">${iconCamera()}</button>
      <button class="text-bottom-icon-btn text-mic-btn" type="button" title="Голос">${iconMic()}</button>
      <button class="text-bottom-icon-btn text-copy-btn" type="button" data-copy-panel="${panelName}" title="Копировать">${iconCopy()}</button>
      <button id="${clearButtonId}" class="text-bottom-icon-btn text-bottom-clear inactive" type="button" title="Очистить">${iconClose()}</button>
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
        <button id="textReadingTab" class="text-panel-tab" type="button">Чтение</button>
        <button id="textSourceTab" class="text-panel-tab active" type="button">Оригинал</button>
        <button id="textTranslationTab" class="text-panel-tab" type="button">Перевод</button>
      </div>

      <div id="textSwipeFrame" class="text-swipe-frame">
        <div id="textSwipeTrack" class="text-swipe-track">
          <section class="text-panel" data-text-panel="reading">
            <div id="textReadingOutput" class="text-reading-placeholder">
              Здесь появится текст для чтения с транскрипцией.
              <small>Позже добавим автоматическую IPA-транскрипцию английского текста.</small>
            </div>
            ${renderTextBottomToolbar("textInlineClearBtnReading", "reading")}
          </section>

          <section class="text-panel" data-text-panel="source">
            <textarea id="textInput" class="text-big-input" placeholder="Вставьте текст для перевода"></textarea>
            ${renderTextBottomToolbar("textInlineClearBtn", "source")}
          </section>

          <section class="text-panel" data-text-panel="translation">
            <div id="textTranslationOutput" class="text-translation-output">
              Перевод появится здесь.
            </div>
            ${renderTextBottomToolbar("textInlineClearBtnTranslation", "translation")}
          </section>
        </div>
      </div>

      <div id="textModeHint" class="text-mode-hint">
        После перевода появятся три панели: чтение, оригинал и перевод. Каждая панель запоминает свою позицию прокрутки.
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
  const readingTab = document.getElementById("textReadingTab");
  const sourceTab = document.getElementById("textSourceTab");
  const translationTab = document.getElementById("textTranslationTab");
  const readingPanel = document.querySelector('[data-text-panel="reading"]');
  const sourcePanel = document.querySelector('[data-text-panel="source"]');
  const translationPanel = document.querySelector('[data-text-panel="translation"]');
  const textInput = document.getElementById("textInput");

  on(translateBtn, "click", handleTextTranslate);
  on(addLexBtn, "click", addSelectedTextWordToDictionary);
  on(miniDisplay, "click", openSelectedTextWordInWordMode);
  on(clearBtn, "click", clearTextMode);
  on(inlineClearBtn, "click", clearTextMode);
  on(inlineClearBtnTranslation, "click", clearTextMode);
  on(readingTab, "click", () => switchTextPanel("reading"));
  on(sourceTab, "click", () => switchTextPanel("source"));
  on(translationTab, "click", () => switchTextPanel("translation"));

  on(readingPanel, "scroll", () => {
    textPanelScroll.reading = readingPanel.scrollTop;
  });

  on(sourcePanel, "scroll", () => {
    textPanelScroll.source = sourcePanel.scrollTop;
  });

  on(translationPanel, "scroll", () => {
    textPanelScroll.translation = translationPanel.scrollTop;
  });

  on(textInput, "input", () => {
    resetTextCopyState();
    updateTextInlineClearVisibility();

    if (!textTranslationReady) {
      updateTextCopyFeedback();
      return;
    }

    textSourceValue = textInput.value;
    updateTextCopyFeedback();
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

    if (dx < 0) {
      if (textActivePanel === "reading") switchTextPanel("source");
      else if (textActivePanel === "source") switchTextPanel("translation");
    } else {
      if (textActivePanel === "translation") switchTextPanel("source");
      else if (textActivePanel === "source") switchTextPanel("reading");
    }
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
  textReadingRequestId += 1;
  textReadingRawValue = "";
  textReadingHtml = buildTextReadingLoadingHtml();
  resetTextCopyState();
  updateTextInlineClearVisibility();
  clearSelectedTextWord();
  textTranslationReady = true;
  textActivePanel = "translation";

  const output = document.getElementById("textTranslationOutput");
  const readingOutput = document.getElementById("textReadingOutput");
  if (output) output.textContent = "Думаю над переводом...";
  if (readingOutput) readingOutput.outerHTML = textReadingHtml;

  const tabs = document.getElementById("textPanelTabs");
  if (tabs) tabs.classList.remove("hidden");

  const hint = document.getElementById("textModeHint");
  if (hint) hint.textContent = "Идёт перевод текста.";

  if (translateBtn) translateBtn.disabled = true;

  switchTextPanel("translation");

  startTextLeftReadingRequest(source, textReadingRequestId);

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

function buildTextReadingLoadingHtml() {
  return `
    <div id="textReadingOutput" class="text-reading-placeholder">
      Готовлю чтение с транскрипцией...
      <small>Английский текст будет разложен на слова и IPA.</small>
    </div>
  `;
}

function buildTextReadingDefaultHtml() {
  return `
    <div id="textReadingOutput" class="text-reading-placeholder">
      Здесь появится текст для чтения с транскрипцией.
      <small>После перевода здесь будет английский текст с IPA для важных слов.</small>
    </div>
  `;
}

function renderTextReadingPanelContentHtml() {
  return textReadingHtml || buildTextReadingDefaultHtml();
}

function setTextReadingHtml(html, rawValue = "") {
  textReadingHtml = html || buildTextReadingDefaultHtml();
  textReadingRawValue = rawValue || "";

  const readingOutput = document.getElementById("textReadingOutput");

  if (readingOutput) {
    readingOutput.outerHTML = textReadingHtml;
  }

  updateTextCopyFeedback();
}

async function startTextLeftReadingRequest(source, requestId) {
  try {
    const data = await callAi("text_left", source);

    if (requestId !== textReadingRequestId) return;

    const payload = getTextReadingPayloadFromAiData(data);

    if (payload) {
      setTextReadingHtml(buildTextReadingHtml(payload), buildTextReadingPlainText(payload));
      return;
    }

    const result = String(data.result || data.raw || "").trim();

    if (result) {
      setTextReadingHtml(buildTextReadingFallbackHtml(result), result);
    } else {
      setTextReadingHtml(buildTextReadingFallbackHtml("Пустой ответ."), "Пустой ответ.");
    }
  } catch (err) {
    if (requestId !== textReadingRequestId) return;

    setTextReadingHtml(
      buildTextReadingFallbackHtml("Ошибка чтения:\n" + err.message),
      "Ошибка чтения:\n" + err.message
    );
  }
}

function getTextReadingPayloadFromAiData(data) {
  const candidates = [
    data?.payload,
    data?.card,
    data?.reading,
    parseJsonObject(data?.result),
    parseJsonObject(data?.raw)
  ];

  for (const candidate of candidates) {
    const payload = normalizeTextReadingPayload(candidate);

    if (payload) return payload;
  }

  return null;
}

function normalizeTextReadingPayload(payload) {
  if (!payload || typeof payload !== "object") return null;

  const lines = Array.isArray(payload.lines)
    ? payload.lines.map(normalizeTextReadingLine).filter(line => line.items.length)
    : [];

  const difficultWords = normalizeObjectArray(payload.difficult_words || payload.difficultWords)
    .map((item) => ({
      word: String(item.word || item.value || item.text || "").trim(),
      ipa: String(item.ipa || item.transcription || "").trim(),
      hint_ru: String(item.hint_ru || item.hintRu || item.hint || "").trim()
    }))
    .filter(item => item.word || item.ipa || item.hint_ru)
    .slice(0, 8);

  const notes = normalizeStringArray(payload.reading_notes_ru || payload.readingNotesRu || payload.notes || payload.notes_ru).slice(0, 5);
  const englishText = String(payload.english_text || payload.englishText || payload.text || "").trim();

  if (!lines.length && !englishText) return null;

  return {
    detected_language: String(payload.detected_language || payload.detectedLanguage || "").trim(),
    english_text: englishText,
    reading_title_ru: String(payload.reading_title_ru || payload.readingTitleRu || "Чтение").trim() || "Чтение",
    lines,
    difficult_words: difficultWords,
    reading_notes_ru: notes
  };
}

function normalizeTextReadingLine(line) {
  const sourceItems = Array.isArray(line?.items)
    ? line.items
    : Array.isArray(line)
      ? line
      : [];

  const items = sourceItems
    .map(normalizeTextReadingItem)
    .filter(item => item.word || item.type === "punctuation");

  return { items };
}

function normalizeTextReadingItem(item) {
  if (!item || typeof item !== "object") {
    const text = String(item || "").trim();
    return {
      word: text,
      ipa: "",
      show_ipa: false,
      type: /\w/.test(text) ? "content" : "punctuation"
    };
  }

  const type = String(item.type || "content").trim().toLowerCase();
  const word = String(item.word || item.text || item.value || item.token || "").trim();
  const ipa = String(item.ipa || item.transcription || item.pronunciation || "").trim();
  const showIpa = item.show_ipa === false || item.showIpa === false ? false : Boolean(ipa);

  return {
    word,
    ipa,
    show_ipa: showIpa,
    type: type === "function" || type === "punctuation" ? type : "content"
  };
}

function buildTextReadingHtml(payload) {
  const title = String(payload.reading_title_ru || "Чтение").trim();
  const lines = Array.isArray(payload.lines) ? payload.lines : [];
  const difficultWords = Array.isArray(payload.difficult_words) ? payload.difficult_words : [];
  const notes = Array.isArray(payload.reading_notes_ru) ? payload.reading_notes_ru : [];

  const linesHtml = lines.length
    ? `<div class="text-reading-lines">
        ${lines.map((line) => `
          <div class="text-reading-line">
            ${(line.items || []).map(buildTextReadingItemHtml).join("")}
          </div>
        `).join("")}
      </div>`
    : `<div class="text-reading-lines"><div class="text-reading-line">${escapeHTML(payload.english_text || "")}</div></div>`;

  const difficultHtml = difficultWords.length
    ? `<section class="text-reading-section">
        <div class="text-reading-section-title">Сложные слова</div>
        <div class="text-reading-difficult-list">
          ${difficultWords.map((item) => `
            <div class="text-reading-difficult-item">
              ${item.word ? `<strong>${escapeHTML(item.word)}</strong>` : ""}
              ${item.ipa ? ` <span class="ipa">${escapeHTML(item.ipa)}</span>` : ""}
              ${item.hint_ru ? ` — ${escapeHTML(item.hint_ru)}` : ""}
            </div>
          `).join("")}
        </div>
      </section>`
    : "";

  const notesHtml = notes.length
    ? `<section class="text-reading-section">
        <div class="text-reading-section-title">Заметки</div>
        <div class="text-reading-difficult-list">
          ${notes.map((note) => `<div class="text-reading-note-item">${escapeHTML(note)}</div>`).join("")}
        </div>
      </section>`
    : "";

  return `
    <div id="textReadingOutput" class="text-reading-output">
      ${title ? `<div class="text-reading-title">${escapeHTML(title)}</div>` : ""}
      ${linesHtml}
      ${difficultHtml}
      ${notesHtml}
    </div>
  `;
}

function buildTextReadingItemHtml(item) {
  const word = String(item?.word || "").trim();
  const ipa = String(item?.ipa || "").trim();
  const type = String(item?.type || "content").trim().toLowerCase();
  const showIpa = Boolean(item?.show_ipa !== false && ipa && type !== "punctuation");

  if (type === "punctuation") {
    return `<span class="text-reading-punctuation">${escapeHTML(word)}</span>`;
  }

  return `
    <span class="text-reading-token ${escapeHTML(type)}">
      ${showIpa ? `<span class="text-reading-ipa">${escapeHTML(ipa)}</span>` : ""}
      <span class="text-reading-word">${escapeHTML(word)}</span>
    </span>
  `;
}

function buildTextReadingPlainText(payload) {
  const lines = Array.isArray(payload?.lines) ? payload.lines : [];

  if (!lines.length) return String(payload?.english_text || "").trim();

  const text = lines.map((line) => {
    return (line.items || []).map((item) => {
      if (item.type === "punctuation") return item.word || "";
      return item.show_ipa && item.ipa ? `${item.word} ${item.ipa}` : item.word;
    }).join(" ")
      .replace(/\s+([,.!?;:])/g, "$1")
      .trim();
  }).join("\n").trim();

  return text || String(payload?.english_text || "").trim();
}

function buildTextReadingFallbackHtml(text) {
  const value = String(text || "").trim() || "Пустой ответ.";

  return `
    <div id="textReadingOutput" class="text-reading-placeholder">
      ${escapeHTML(value)}
    </div>
  `;
}

function bindTextInlineClearButtons() {
  const inlineClearBtnReading = document.getElementById("textInlineClearBtnReading");
  const inlineClearBtn = document.getElementById("textInlineClearBtn");
  const inlineClearBtnTranslation = document.getElementById("textInlineClearBtnTranslation");

  if (inlineClearBtnReading) inlineClearBtnReading.onclick = () => {
    if (!inlineClearBtnReading.classList.contains("inactive")) clearTextMode();
  };
  if (inlineClearBtn) inlineClearBtn.onclick = () => {
    if (!inlineClearBtn.classList.contains("inactive")) clearTextMode();
  };
  if (inlineClearBtnTranslation) inlineClearBtnTranslation.onclick = () => {
    if (!inlineClearBtnTranslation.classList.contains("inactive")) clearTextMode();
  };

  document.querySelectorAll(".text-camera-btn, .text-mic-btn").forEach((btn) => {
    btn.onclick = () => {};
  });

  document.querySelectorAll(".text-copy-btn").forEach((btn) => {
    btn.onclick = copyActiveTextPanel;
  });

  updateTextCopyFeedback();
  updateTextInlineClearVisibility();
}

async function copyActiveTextPanel(event) {
  const panelName = event?.currentTarget?.dataset?.copyPanel || textActivePanel;

  if (!isValidTextPanel(panelName)) return;

  const panelValue = getTextPanelCopyValue(panelName).trim();

  if (!panelValue) return;

  let nextPanels = Array.isArray(textCopiedPanels) ? textCopiedPanels.slice() : [];
  const alreadySelected = nextPanels.includes(panelName);

  if (alreadySelected && nextPanels.length > 1) {
    nextPanels = nextPanels.filter((item) => item !== panelName);
  } else if (!alreadySelected) {
    nextPanels.push(panelName);
  }

  nextPanels = normalizeCopyPanelOrder(nextPanels).filter((item) => {
    return Boolean(getTextPanelCopyValue(item).trim());
  });

  if (!nextPanels.length) {
    nextPanels = [panelName];
  }

  const copyText = buildCombinedCopyText(nextPanels);

  if (!copyText.trim()) return;

  const copied = await writeTextToClipboard(copyText);

  if (copied) {
    textCopiedPanels = nextPanels;
    textCopiedSignature = buildCopySignature(nextPanels);
    updateTextCopyFeedback();
  }
}

function getTextPanelCopyValue(panelName) {
  const textInput = document.getElementById("textInput");
  const readingOutput = document.getElementById("textReadingOutput");
  const sourceClickable = document.getElementById("textSourceClickableOutput");
  const translationOutput = document.getElementById("textTranslationOutput");

  if (panelName === "reading") {
    return String(textReadingRawValue || readingOutput?.innerText || "");
  }

  if (panelName === "translation") {
    return String(translationOutput?.innerText || textTranslatedValue || "");
  }

  return String(textInput?.value || sourceClickable?.innerText || textSourceValue || "");
}

function normalizeCopyPanelOrder(panels) {
  const unique = Array.from(new Set((panels || []).filter(Boolean)));

  return ["reading", "source", "translation"].filter((panelName) => unique.includes(panelName));
}

function getTextPanelCopyLabel(panelName) {
  if (panelName === "reading") return "Чтение";
  return panelName === "translation" ? "Перевод" : "Оригинал";
}

function buildCombinedCopyText(panels) {
  const orderedPanels = normalizeCopyPanelOrder(panels);

  if (orderedPanels.length === 1) {
    return getTextPanelCopyValue(orderedPanels[0]).trim();
  }

  return orderedPanels
    .map((panelName) => {
      const value = getTextPanelCopyValue(panelName).trim();

      if (!value) return "";

      return `${getTextPanelCopyLabel(panelName)}:\n\n${value}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function buildCopySignature(panels) {
  return normalizeCopyPanelOrder(panels)
    .map((panelName) => `${panelName}:${getTextPanelCopyValue(panelName).trim()}`)
    .join("\n---LEXICON-COPY---\n");
}

function resetTextCopyState() {
  textCopiedPanels = [];
  textCopiedSignature = "";
}

async function writeTextToClipboard(text) {
  let copied = false;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch {}

  if (!copied) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    area.style.top = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();

    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }

    area.remove();
  }

  return copied;
}

function updateTextCopyFeedback() {
  const selectedPanels = normalizeCopyPanelOrder(textCopiedPanels);
  const signatureIsCurrent = Boolean(
    selectedPanels.length &&
    textCopiedSignature &&
    buildCopySignature(selectedPanels) === textCopiedSignature
  );

  document.querySelectorAll(".text-copy-btn").forEach((btn) => {
    const panelName = btn.dataset.copyPanel || "source";
    const currentValue = getTextPanelCopyValue(panelName).trim();
    const isCopied = Boolean(signatureIsCurrent && currentValue && selectedPanels.includes(panelName));

    btn.classList.toggle("copied", isCopied);
    btn.innerHTML = isCopied ? iconCheck() : iconCopy();

    if (isCopied && selectedPanels.length > 1) {
      btn.title = "Скопировано вместе";
    } else {
      btn.title = isCopied ? "Скопировано" : "Копировать";
    }
  });
}

function bindTextInputAfterReset() {
  const textInput = document.getElementById("textInput");

  if (!textInput) return;

  textInput.oninput = () => {
    resetTextCopyState();
    updateTextInlineClearVisibility();

    if (!textTranslationReady) {
      updateTextCopyFeedback();
      return;
    }

    textSourceValue = textInput.value;
    updateTextCopyFeedback();
  };

  updateTextInlineClearVisibility();
}

function updateTextInlineClearVisibility() {
  const inlineClearBtnReading = document.getElementById("textInlineClearBtnReading");
  const inlineClearBtn = document.getElementById("textInlineClearBtn");
  const inlineClearBtnTranslation = document.getElementById("textInlineClearBtnTranslation");
  const textInput = document.getElementById("textInput");

  const hasText = Boolean(
    textTranslationReady ||
    textSourceValue ||
    textTranslatedValue ||
    (textInput && textInput.value.trim())
  );

  if (inlineClearBtnReading) inlineClearBtnReading.classList.toggle("inactive", !hasText);
  if (inlineClearBtn) inlineClearBtn.classList.toggle("inactive", !hasText);
  if (inlineClearBtnTranslation) inlineClearBtnTranslation.classList.toggle("inactive", !hasText);
}

function renderClickableTextPanels(sourceText, translatedText) {
  const readingPanel = document.querySelector('[data-text-panel="reading"]');
  const sourcePanel = document.querySelector('[data-text-panel="source"]');
  const translationPanel = document.querySelector('[data-text-panel="translation"]');

  clearSelectedTextWord();

  if (readingPanel) {
    readingPanel.innerHTML = `
      ${renderTextReadingPanelContentHtml()}
      ${renderTextBottomToolbar("textInlineClearBtnReading", "reading")}
    `;
  }

  if (sourcePanel) {
    sourcePanel.innerHTML = `
      <div id="textSourceClickableOutput" class="text-clickable-output" data-clickable-text="source">
        ${makeClickableTextHtml(sourceText)}
      </div>
      ${renderTextBottomToolbar("textInlineClearBtn", "source")}
    `;
  }

  if (translationPanel) {
    translationPanel.innerHTML = `
      <div id="textTranslationOutput" class="text-translation-output text-clickable-output" data-clickable-text="translation">
        ${makeClickableTextHtml(translatedText)}
      </div>
      ${renderTextBottomToolbar("textInlineClearBtnTranslation", "translation")}
    `;
  }

  bindClickableTextWords();
  bindTextInlineClearButtons();
  updateTextInlineClearVisibility();
  updateTextCopyFeedback();
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

  lastWordTranslateSource = word;
  wordCopiedValue = "";
  currentWordTranslationCard = null;
  currentWordPartIndex = 0;
  wordExamplesExpanded = false;
  wordActivePanel = "center";
  wordSideRequestId += 1;
  wordLeftPanelHtml = "";
  wordRightPanelHtml = "";
  wordLeftPanelPayload = null;
  wordRightPanelPayload = null;

  if (wordInput) {
    wordInput.value = word;
    wordInput.focus();
  }

  hideAddCurrentWordButton();
  setWordResult("Перевод появится здесь.", true);
  updateWordSwipeUI();
  updateWordModeButtons();
  updateWordCopyFeedback();

  if (homeResultCard) homeResultCard.classList.add("hidden");
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


function isValidTextPanel(panelName) {
  return panelName === "reading" || panelName === "source" || panelName === "translation";
}

function switchTextPanel(panelName) {
  if (!isValidTextPanel(panelName)) return;

  const readingPanel = document.querySelector('[data-text-panel="reading"]');
  const sourcePanel = document.querySelector('[data-text-panel="source"]');
  const translationPanel = document.querySelector('[data-text-panel="translation"]');

  if (readingPanel) textPanelScroll.reading = readingPanel.scrollTop;
  if (sourcePanel) textPanelScroll.source = sourcePanel.scrollTop;
  if (translationPanel) textPanelScroll.translation = translationPanel.scrollTop;

  textActivePanel = panelName;
  updateTextPanelUI();

  requestAnimationFrame(() => {
    if (readingPanel) readingPanel.scrollTop = textPanelScroll.reading;
    if (sourcePanel) sourcePanel.scrollTop = textPanelScroll.source;
    if (translationPanel) translationPanel.scrollTop = textPanelScroll.translation;
  });
}

function updateTextPanelUI() {
  const track = document.getElementById("textSwipeTrack");
  const readingTab = document.getElementById("textReadingTab");
  const sourceTab = document.getElementById("textSourceTab");
  const translationTab = document.getElementById("textTranslationTab");

  if (track) {
    const offsets = {
      reading: "0%",
      source: "-33.333333%",
      translation: "-66.666666%"
    };

    track.style.transform = `translateX(${offsets[textActivePanel] || offsets.source})`;
  }

  if (readingTab) readingTab.classList.toggle("active", textActivePanel === "reading");
  if (sourceTab) sourceTab.classList.toggle("active", textActivePanel === "source");
  if (translationTab) translationTab.classList.toggle("active", textActivePanel === "translation");
}

function clearTextMode() {
  const readingPanel = document.querySelector('[data-text-panel="reading"]');
  const sourcePanel = document.querySelector('[data-text-panel="source"]');
  const translationPanel = document.querySelector('[data-text-panel="translation"]');
  const tabs = document.getElementById("textPanelTabs");
  const hint = document.getElementById("textModeHint");

  textTranslationReady = false;
  textActivePanel = "source";
  textSourceValue = "";
  textTranslatedValue = "";
  textReadingRequestId += 1;
  textReadingHtml = "";
  textReadingRawValue = "";
  textPanelScroll.reading = 0;
  textPanelScroll.source = 0;
  textPanelScroll.translation = 0;
  resetTextCopyState();
  clearSelectedTextWord();

  if (readingPanel) {
    readingPanel.innerHTML = `
      <div id="textReadingOutput" class="text-reading-placeholder">
        Здесь появится текст для чтения с транскрипцией.
        <small>Позже добавим автоматическую IPA-транскрипцию английского текста.</small>
      </div>
      ${renderTextBottomToolbar("textInlineClearBtnReading", "reading")}
    `;
  }

  if (sourcePanel) {
    sourcePanel.innerHTML = `
      <textarea id="textInput" class="text-big-input" placeholder="Вставьте текст для перевода"></textarea>
      ${renderTextBottomToolbar("textInlineClearBtn", "source")}
    `;
  }

  if (translationPanel) {
    translationPanel.innerHTML = `
      <div id="textTranslationOutput" class="text-translation-output">
        Перевод появится здесь.
      </div>
      ${renderTextBottomToolbar("textInlineClearBtnTranslation", "translation")}
    `;
  }

  bindTextInlineClearButtons();
  updateTextCopyFeedback();

  if (tabs) tabs.classList.add("hidden");

  if (hint) {
    hint.textContent = "После перевода появятся три панели: чтение, оригинал и перевод. Каждая панель запоминает свою позицию прокрутки.";
  }

  updateTextPanelUI();

  requestAnimationFrame(() => {
    const nextReadingPanel = document.querySelector('[data-text-panel="reading"]');
    const nextSourcePanel = document.querySelector('[data-text-panel="source"]');
    const nextTranslationPanel = document.querySelector('[data-text-panel="translation"]');
    const textInput = document.getElementById("textInput");

    if (nextReadingPanel) nextReadingPanel.scrollTop = 0;
    if (nextSourcePanel) nextSourcePanel.scrollTop = 0;
    if (nextTranslationPanel) nextTranslationPanel.scrollTop = 0;

    bindTextInputAfterReset();

    if (textInput) textInput.focus();
  });
}

function syncTextModeVisibility(mode) {
  if (homeResultCard) {
    homeResultCard.classList.add("hidden");
  }

  if (mode === "text") {
    hideAddCurrentWordButton();
    updateTextPanelUI();
  } else {
    clearSelectedTextWord();
    updateWordModeButtons();
    updateWordCopyFeedback();
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
        <button id="backHomeFromLexiconBtn" class="back-btn lexicon-back-icon-btn" type="button" title="Назад">←</button>

        <div class="lexicon-title-block">
          <div class="lexicon-subtitle">${dictionaries.length} словарей • ${totalWords} слов</div>
        </div>

        <div class="lexicon-actions">
          <button id="lexiconMenuBtn" class="lexicon-icon-btn" type="button" title="Меню">☰</button>
          <button id="addDictionaryBtn" class="lexicon-add-btn" type="button" title="Добавить словарь">+</button>
        </div>
      </div>

      <div id="dictionaryList" class="dictionary-list"></div>
    </section>
  `;

  backHomeFromLexiconBtn = document.getElementById("backHomeFromLexiconBtn");
  on(backHomeFromLexiconBtn, "click", () => showPage("home"));

  const addDictionaryBtn = document.getElementById("addDictionaryBtn");
  const lexiconMenuBtn = document.getElementById("lexiconMenuBtn");
  on(addDictionaryBtn, "click", addDictionary);
  on(lexiconMenuBtn, "click", () => alert("Меню пока заглушка. Потом здесь будут импорт, экспорт, настройки и режимы."));

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
        </div>
        <div class="dictionary-count">${wordCount}</div>
      </button>

      <div class="dictionary-panel ${isOpen ? "" : "hidden"}">
        <div class="dictionary-panel-head">
          <div class="dictionary-add-row">
            <input class="dictionary-word-input" data-word-input="${dict.id}" type="text" placeholder="+ Введите слово..." />
            <button class="dictionary-add-word-btn" type="button" data-word-add="${dict.id}">Ввод</button>
          </div>

          <div class="dictionary-panel-actions">
            <div class="dictionary-panel-menu-wrap">
              <button class="dictionary-panel-menu-btn" type="button" data-dict-menu="${dict.id}" title="Меню словаря">⋯</button>
            </div>
          </div>
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


  list.querySelectorAll("[data-dict-menu]").forEach((btn) => {
    on(btn, "click", (event) => {
      event.stopPropagation();
      openDictionaryMenu(btn.dataset.dictMenu, btn);
    });
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

  return words.map((item, index) => {
    const word = String(item.word || "").trim();
    const transcription = String(item.transcription || "").trim();
    const translation = String(item.translation || "перевод позже").trim();
    const partOfSpeech = String(item.partOfSpeech || "").trim();
    const showTranscription = shouldShowDictionaryItemTranscription(word, transcription);

    return `
      <div class="word-row dictionary-word-card" data-word-open="${escapeHTML(word)}">
        <span class="word-number-badge" title="Номер слова">${index + 1}</span>

        <div class="word-main dictionary-word-main">
          <div class="word-line dictionary-word-line">
            <span class="word-text dictionary-word-text">${escapeHTML(word)}</span>
            ${showTranscription ? `<span class="word-transcription dictionary-word-transcription">${escapeHTML(transcription)}</span>` : ""}
            ${partOfSpeech ? `<span class="word-pos dictionary-word-pos">${escapeHTML(partOfSpeech)}</span>` : ""}
          </div>
          <div class="word-translation dictionary-word-translation">${escapeHTML(translation || "перевод позже")}</div>
        </div>

        <button class="word-delete-btn dictionary-word-delete-btn" type="button" data-dictionary-id="${dict.id}" data-word-delete="${item.id}" title="Удалить">×</button>
      </div>
    `;
  }).join("");
}

function shouldShowDictionaryItemTranscription(word, transcription) {
  const cleanWord = String(word || "").trim();
  const cleanTranscription = String(transcription || "").trim();

  if (!cleanWord || !cleanTranscription) return false;
  if (cleanTranscription === "—" || cleanTranscription === "..." || cleanTranscription === "…") return false;
  if (cleanWord.split(/\s+/).filter(Boolean).length !== 1) return false;
  if (!/[A-Za-z]/.test(cleanWord) || /[А-Яа-яЁё]/.test(cleanWord)) return false;

  return true;
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


function closeDictionaryMenu() {
  const existing = document.getElementById("dictionaryMenuPopover");
  if (existing) existing.remove();
}

function openDictionaryMenu(dictionaryId, anchor) {
  const dict = dictionaries.find((item) => item.id === dictionaryId);
  if (!dict || !anchor) return;

  closeDictionaryMenu();

  const popover = document.createElement("div");
  popover.id = "dictionaryMenuPopover";
  popover.className = "dictionary-menu-popover";
  popover.innerHTML = `
    <button type="button" data-menu-action="rename">Rename</button>
    <button type="button" class="danger" data-menu-action="delete">Delete</button>
  `;

  document.body.appendChild(popover);

  const rect = anchor.getBoundingClientRect();
  const popoverWidth = 154;
  const left = Math.max(10, Math.min(window.innerWidth - popoverWidth - 10, rect.right - popoverWidth));
  const top = Math.min(window.innerHeight - 96, rect.bottom + 8);

  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;

  const handleOutside = (event) => {
    if (!popover.contains(event.target) && event.target !== anchor) {
      closeDictionaryMenu();
      document.removeEventListener("click", handleOutside, true);
    }
  };

  requestAnimationFrame(() => {
    document.addEventListener("click", handleOutside, true);
  });

  popover.querySelector('[data-menu-action="rename"]')?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeDictionaryMenu();
    document.removeEventListener("click", handleOutside, true);
    renameDictionary(dictionaryId);
  });

  popover.querySelector('[data-menu-action="delete"]')?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeDictionaryMenu();
    document.removeEventListener("click", handleOutside, true);
    deleteDictionary(dictionaryId);
  });
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

  lastWordTranslateSource = String(word || "").trim();
  wordCopiedValue = "";
  currentWordTranslationCard = null;
  currentWordPartIndex = 0;
  wordExamplesExpanded = false;
  wordActivePanel = "center";
  wordSideRequestId += 1;
  wordLeftPanelHtml = "";
  wordRightPanelHtml = "";
  wordLeftPanelPayload = null;
  wordRightPanelPayload = null;

  if (wordInput) {
    wordInput.value = lastWordTranslateSource;
    wordInput.focus();
  }

  setWordResult("Перевод появится здесь.", true);
  updateWordSwipeUI();
  updateWordModeButtons();
  updateWordCopyFeedback();

  if (homeResultCard) homeResultCard.classList.add("hidden");
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
