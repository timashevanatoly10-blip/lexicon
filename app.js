const API_BASE = "https://lexicon-worker.timashevanatoly10.workers.dev";
const VETAI_API_BASE = "https://gpt24-test.timashevanatoly10.workers.dev";
const TOKEN_STORAGE_KEY = "lexicon_access_token";
const LEXICON_STORAGE_KEY = "lexicon_dictionaries_v1";

let publicDictionaryMode = false;
let publicDictionaryShareId = "";
let vettingSessionId = localStorage.getItem("vetai_session_id") || "";
let vettingBusy = false;
let vettingActiveRole = "ETO";
let vettingActiveMode = "cards";
let vettingCardLang = "en";
let vettingLastCardPayload = null;

let currentDocumentId = "";
let currentDocumentKey = "";
let dictionaries = loadDictionaries();
let expandedDictionaryId = null;
let dictionaryEditModeId = null;
let expandedDictionaryWordKey = null;
let dictionaryWordActivePanel = "center";
let dictionaryWordPartIndex = 0;
let dictionaryWordExamplesExpanded = false;
const selectedDictionaryWordIds = new Set();
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

let textAudioRecorder = null;
let textAudioStream = null;
let textAudioChunks = [];
let textAudioRecordingStartedAt = 0;
let textAudioIsRecording = false;
let textAudioIsProcessing = false;

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

const initialPublicDictionaryShareId = getPublicDictionaryShareIdFromUrl();
if (initialPublicDictionaryShareId) {
  publicDictionaryMode = true;
  publicDictionaryShareId = initialPublicDictionaryShareId;
}

ensureWordModeMarkup();
ensureTextModeMarkup();
ensureFilesPageMarkup();
refreshFileElements();
bindEvents();
ensureDictionaryPickerStyles();
retireLegacyHomeResultCard();

if (publicDictionaryMode) {
  bootstrapPublicDictionaryFromUrl();
} else {
  initAccessToken();
  bootstrapDictionaries();
  showPage("home");
}

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
    @keyframes textAttachBubbleIn {
      from { opacity: 0; transform: translate(-50%, 10px) scale(0.54); }
      to { opacity: 1; transform: translate(-50%, 0) scale(1); }
    }

    @keyframes textAttachBackdropIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .text-attach-menu-backdrop {
      position: fixed;
      inset: 0;
      z-index: 9996;
      background: transparent;
      animation: textAttachBackdropIn 0.12s ease-out;
    }

    .text-attach-menu {
      position: fixed;
      z-index: 9997;
      pointer-events: none;
    }

    .text-attach-option {
      position: absolute;
      left: 0;
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
        0 8px 18px rgba(60,80,65,0.12);
      -webkit-tap-highlight-color: transparent;
      cursor: pointer;
      pointer-events: auto;
      animation: textAttachBubbleIn 0.18s cubic-bezier(.2,.9,.2,1.12) both;
      transform-origin: 50% 100%;
    }

    .text-attach-option:nth-child(2) { animation-delay: 0.025s; }
    .text-attach-option:nth-child(3) { animation-delay: 0.05s; }

    .text-attach-option.primary {
      width: 42px;
      height: 42px;
      color: #2f7d59;
      background:
        radial-gradient(circle at 50% 52%, rgba(223,237,225,0.94) 0%, rgba(244,249,243,0.97) 56%, rgba(255,255,255,0.99) 100%);
      box-shadow:
        inset 0 0 0 3px rgba(255,255,255,0.48),
        inset 2px 2px 5px rgba(255,255,255,0.82),
        inset -3px -3px 7px rgba(143,177,147,0.16),
        0 9px 20px rgba(60,80,65,0.13);
    }

    .text-attach-option.primary svg {
      width: 18.5px;
      height: 18.5px;
    }

    .text-attach-option:active {
      transform: translate(-50%, 0) scale(0.94);
      box-shadow:
        inset 2px 2px 6px rgba(186,193,184,0.12),
        0 4px 12px rgba(60,80,65,0.10);
    }

    .text-attach-option svg {
      width: 17.5px;
      height: 17.5px;
      stroke: currentColor;
      stroke-width: 2.3;
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .text-attach-btn.open {
      color: #2f7d59;
      background:
        radial-gradient(circle at 50% 52%, rgba(223,237,225,0.92) 0%, rgba(244,249,243,0.96) 56%, rgba(255,255,255,0.99) 100%);
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

    .text-processing-overlay {
      position: absolute;
      left: 50%;
      top: 50%;
      z-index: 12;
      transform: translate(-50%, -50%);
      min-width: 190px;
      max-width: calc(100% - 46px);
      padding: 13px 18px;
      border-radius: 22px;
      background:
        radial-gradient(circle at 50% 52%, rgba(240,243,239,0.92) 0%, rgba(249,250,247,0.97) 56%, rgba(255,255,255,0.99) 100%);
      border: 2px solid rgba(255,255,255,0.94);
      color: #1f6f56;
      font-size: clamp(14px, 3.25vw, 18px);
      font-weight: 650;
      line-height: 1.15;
      text-align: center;
      letter-spacing: -0.01em;
      box-shadow:
        inset 0 0 0 2px rgba(255,255,255,0.42),
        inset 2px 2px 5px rgba(255,255,255,0.78),
        inset -3px -3px 7px rgba(205,214,204,0.15),
        0 12px 32px rgba(60,80,65,0.13);
      pointer-events: none;
      animation: textAttachBubbleIn 0.16s cubic-bezier(.2,.9,.2,1.08) both;
    }

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

    .text-mic-btn.recording {
      color: #ffffff !important;
      background:
        radial-gradient(circle at 50% 52%, rgba(95,153,98,0.92) 0%, rgba(73,137,90,0.94) 58%, rgba(31,111,86,0.98) 100%) !important;
      box-shadow:
        inset 0 0 0 3px rgba(255,255,255,0.20),
        inset 2px 2px 5px rgba(255,255,255,0.22),
        0 0 0 4px rgba(95,153,98,0.10),
        0 8px 20px rgba(31,111,86,0.18) !important;
    }

    .text-mic-btn.processing {
      opacity: 0.62;
      pointer-events: none;
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
      gap: 0;
      margin-top: 2px;
      padding: 0 2px;
    }

    .dictionary-panel .word-row.dictionary-word-card {
      position: relative;
      display: grid;
      grid-template-columns: 24px minmax(0, 1fr) !important;
      align-items: start;
      gap: 7px;
      width: 100%;
      box-sizing: border-box;
      padding: 12px 8px 13px 2px;
      border-radius: 0;
      background: transparent;
      border: 0;
      border-bottom: 1px solid rgba(224,228,222,0.70);
      box-shadow: none;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .dictionary-panel .word-row.dictionary-word-card:last-child {
      border-bottom: 0;
    }

    .dictionary-panel .word-row.dictionary-word-card:active {
      transform: scale(0.998);
      background: rgba(95,153,98,0.035);
    }

    .dictionary-panel .word-row.dictionary-word-card.editing {
      grid-template-columns: 24px minmax(0, 1fr) 28px !important;
    }

    .dictionary-panel .word-row.dictionary-word-card.selected {
      background: rgba(95,153,98,0.07);
      border-radius: 14px;
      border-bottom-color: rgba(95,153,98,0.12);
    }

    .dictionary-panel .word-number-badge {
      width: 20px;
      height: 20px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-top: 1px;
      background: rgba(95,153,98,0.09);
      border: 1px solid rgba(95,153,98,0.15);
      color: #1f6f56;
      font-size: clamp(9px, 2.05vw, 11px);
      font-weight: 760;
      line-height: 1;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.38),
        0 1px 3px rgba(180,188,178,0.035);
      user-select: none;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
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
      white-space: normal !important;
      overflow: visible !important;
    }

    .dictionary-panel .dictionary-word-text {
      color: #1f211f;
      font-size: clamp(14px, 3.2vw, 18px);
      font-weight: 720;
      line-height: 1.16;
      letter-spacing: -0.016em;
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
      white-space: normal !important;
      overflow: visible !important;
      text-overflow: clip !important;
      max-width: none !important;
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
      background: transparent;
      color: rgba(31,33,31,0.34);
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

    .dictionary-public-title {
      min-width: 0 !important;
      width: 100% !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      padding: 2px 4px !important;
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
      width: 38px !important;
      min-width: 38px !important;
      height: 38px !important;
      padding: 0 0 3px !important;
      border-radius: 999px !important;
      border: 2px solid rgba(255,255,255,0.94) !important;
      background:
        radial-gradient(circle at 50% 52%, rgba(240,243,239,0.82) 0%, rgba(249,250,247,0.92) 56%, rgba(255,255,255,0.99) 100%) !important;
      color: #5f9962 !important;
      font-size: 26px !important;
      font-weight: 520 !important;
      line-height: 1 !important;
      box-shadow:
        inset 0 0 0 3px rgba(255,255,255,0.42),
        inset 2px 2px 5px rgba(255,255,255,0.80),
        inset -3px -3px 7px rgba(205,214,204,0.16),
        0 2px 5px rgba(186,193,184,0.08) !important;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: transform 0.12s ease, opacity 0.12s ease, box-shadow 0.12s ease;
    }

    .dictionary-add-word-btn:active {
      transform: scale(0.96);
      box-shadow:
        inset 2px 2px 6px rgba(186,193,184,0.12),
        0 1px 4px rgba(186,193,184,0.10) !important;
    }


    .dictionary-block.open {
      --dictionary-sticky-top: 10px;
      --dictionary-sticky-head-offset: 46px;
    }

    .dictionary-block.open .dictionary-line {
      position: sticky !important;
      top: var(--dictionary-sticky-top) !important;
      z-index: 90 !important;
    }

    .dictionary-block.open .dictionary-panel {
      overflow: visible !important;
    }

    .dictionary-block.open .dictionary-panel-head {
      position: sticky !important;
      top: calc(var(--dictionary-sticky-top) + var(--dictionary-sticky-head-offset)) !important;
      z-index: 89 !important;
    }

    .dictionary-menu-popover {
      position: fixed;
      z-index: 9998;
      min-width: 118px;
      border-radius: 15px;
      padding: 5px;
      background: rgba(255,255,252,0.98);
      border: 1px solid rgba(226,231,224,0.84);
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.50),
        0 10px 26px rgba(20,40,30,0.14);
      animation: dictionaryPickerRise 0.14s ease-out;
    }

    .dictionary-menu-popover button {
      width: 100%;
      min-height: 30px;
      border: 0;
      border-radius: 11px;
      background: transparent;
      color: rgba(31,33,31,0.82);
      padding: 0 9px;
      text-align: left;
      font-size: 13px;
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


    .dictionary-block.word-card-open .dictionary-line,
    .dictionary-block.word-card-open .dictionary-panel-head {
      position: static !important;
      top: auto !important;
      z-index: auto !important;
    }

    .dictionary-word-expanded-shell {
      position: relative;
      width: 100%;
      box-sizing: border-box;
      margin: 0 0 10px;
    }

    .dictionary-word-expanded-sticky {
      position: sticky;
      top: max(10px, env(safe-area-inset-top));
      z-index: 95;
      margin: 0 -2px 8px;
      padding: 0 0 7px;
      border-radius: 20px;
      background: rgba(250,251,248,0.96);
      box-shadow: 0 8px 18px rgba(180,186,176,0.08);
    }

    .dictionary-word-expanded-sticky .dictionary-word-card {
      border-bottom: 0 !important;
      border-radius: 18px !important;
      padding: 10px 8px 9px 2px !important;
      background:
        radial-gradient(circle at 50% 52%, rgba(241,244,240,0.74) 0%, rgba(248,249,246,0.88) 58%, rgba(255,255,255,0.98) 100%) !important;
      border: 2px solid rgba(255,255,255,0.90) !important;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.36),
        inset 2px 2px 4px rgba(255,255,255,0.62),
        inset -2px -2px 5px rgba(205,214,204,0.08),
        0 1px 4px rgba(186,193,184,0.06) !important;
    }

    .dictionary-word-expanded-sticky .dictionary-word-card:active {
      transform: scale(0.998);
    }

    .dictionary-word-panel-tabs {
      margin: 7px 2px 0 !important;
    }

    .dictionary-word-inline-detail {
      margin: 0 -2px 12px;
      overflow: hidden;
      border-radius: 24px;
      background: rgba(250,251,248,0.94);
      border: 2px solid rgba(255,255,255,0.76);
      box-shadow:
        inset 0 0 0 2px rgba(255,255,255,0.42),
        inset 2px 2px 5px rgba(255,255,255,0.62),
        inset -2px -2px 6px rgba(197,207,196,0.12),
        0 1px 5px rgba(180,186,176,0.06);
    }

    .dictionary-word-inline-swipe-frame {
      width: 100%;
      overflow: hidden;
      background: rgba(255,255,255,0.54);
      touch-action: pan-y;
    }

    .dictionary-word-inline-swipe-track {
      width: 300%;
      display: flex;
      align-items: stretch;
      transition: transform 0.24s ease;
      will-change: transform;
    }

    .dictionary-word-inline-panel {
      width: 33.333333%;
      flex: 0 0 33.333333%;
      min-width: 0;
      box-sizing: border-box;
      background: rgba(255,255,255,0.54);
    }

    .dictionary-word-inline-loading,
    .dictionary-word-inline-error,
    .dictionary-word-inline-empty {
      padding: 20px 14px 86px;
      min-height: 260px;
      color: rgba(31,33,31,0.70);
      font-size: clamp(13px, 3vw, 17px);
      line-height: 1.38;
    }

    .dictionary-word-inline-error {
      color: rgba(150,48,45,0.86);
    }



    .public-lexicon-shell .lexicon-topline {
      display: block !important;
      min-height: 0 !important;
      padding: 4px 8px 10px !important;
    }

    .public-lexicon-header {
      width: 100% !important;
      min-height: 72px !important;
      box-sizing: border-box !important;
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) auto !important;
      align-items: center !important;
      gap: 10px !important;
      padding: 12px 13px !important;
      border-radius: 28px !important;
      background:
        radial-gradient(circle at 50% 52%, rgba(241,244,240,0.74) 0%, rgba(248,249,246,0.90) 58%, rgba(255,255,255,0.98) 100%) !important;
      border: 2px solid rgba(255,255,255,0.92) !important;
      box-shadow:
        inset 0 0 0 2px rgba(255,255,255,0.42),
        inset 2px 2px 5px rgba(255,255,255,0.72),
        inset -3px -3px 7px rgba(205,214,204,0.10),
        0 2px 6px rgba(186,193,184,0.07) !important;
    }

    .public-lexicon-title-block {
      min-width: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      gap: 4px !important;
    }

    .public-lexicon-title {
      color: #1f6f56 !important;
      font-size: clamp(16px, 3.75vw, 22px) !important;
      font-weight: 720 !important;
      line-height: 1.06 !important;
      letter-spacing: -0.025em !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    .public-lexicon-count {
      color: rgba(31,33,31,0.54) !important;
      font-size: clamp(11.5px, 2.6vw, 14.5px) !important;
      font-weight: 600 !important;
      line-height: 1.1 !important;
      letter-spacing: -0.005em !important;
    }

    .public-lexicon-add-btn {
      min-width: 104px !important;
      height: 38px !important;
      padding: 0 13px !important;
      border-radius: 999px !important;
      border: 2px solid rgba(255,255,255,0.94) !important;
      background:
        radial-gradient(circle at 50% 52%, rgba(240,243,239,0.82) 0%, rgba(249,250,247,0.94) 56%, rgba(255,255,255,0.99) 100%) !important;
      color: #1f6f56 !important;
      font-size: clamp(11px, 2.55vw, 13.5px) !important;
      font-weight: 760 !important;
      line-height: 1 !important;
      letter-spacing: -0.01em !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 5px !important;
      box-shadow:
        inset 0 0 0 3px rgba(255,255,255,0.42),
        inset 2px 2px 5px rgba(255,255,255,0.78),
        inset -3px -3px 7px rgba(205,214,204,0.14),
        0 2px 5px rgba(186,193,184,0.08) !important;
      cursor: pointer !important;
      -webkit-tap-highlight-color: transparent !important;
    }

    .public-lexicon-add-btn:active {
      transform: scale(0.97) !important;
      box-shadow:
        inset 2px 2px 6px rgba(186,193,184,0.12),
        0 1px 4px rgba(186,193,184,0.10) !important;
    }

    .public-lexicon-shell .dictionary-panel-head {
      display: none !important;
    }

    .public-lexicon-shell .dictionary-panel {
      padding-top: 10px !important;
    }

    .public-lexicon-shell .dictionary-block.open {
      --dictionary-sticky-head-offset: 0px;
    }


    .ai-shell {
      --ai-green: #1f6f56;
      --ai-soft-green: #5f9962;
      width: 100%;
      box-sizing: border-box;
      padding: 0 4px 10px;
    }

    .ai-topline {
      display: grid;
      grid-template-columns: 42px minmax(0, 1fr);
      align-items: center;
      gap: 10px;
      min-height: 58px;
      padding: 4px 8px 9px;
      box-sizing: border-box;
    }

    .ai-back-btn {
      width: 38px !important;
      min-width: 38px !important;
      height: 38px !important;
      padding: 0 !important;
      border-radius: 999px !important;
      border: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      color: var(--ai-green) !important;
      font-size: 27px !important;
      font-weight: 500 !important;
      line-height: 1 !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      transform: translateY(-4px) !important;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .ai-title-block {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
      transform: translateY(1px);
    }

    .ai-title {
      color: var(--ai-green);
      font-size: clamp(18px, 4.3vw, 26px);
      font-weight: 760;
      line-height: 1.05;
      letter-spacing: -0.035em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ai-subtitle {
      color: rgba(31,33,31,0.54);
      font-size: clamp(11.5px, 2.75vw, 15px);
      font-weight: 560;
      line-height: 1.15;
      letter-spacing: -0.008em;
    }

    .ai-hub-card,
    .vetting-main-card {
      width: 100%;
      box-sizing: border-box;
      border-radius: 30px;
      background: rgba(250,251,248,0.94);
      border: 2px solid rgba(255,255,255,0.76);
      box-shadow:
        inset 0 0 0 2px rgba(255,255,255,0.42),
        inset 2px 2px 5px rgba(255,255,255,0.62),
        inset -2px -2px 6px rgba(197,207,196,0.12),
        0 1px 5px rgba(180,186,176,0.06);
      padding: 13px;
    }

    .ai-assistant-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 9px;
    }

    .ai-assistant-pill {
      min-width: 0;
      min-height: clamp(74px, 15.3vh, 104px);
      border-radius: 28px;
      border: 2px solid rgba(255,255,255,0.92);
      background:
        radial-gradient(circle at 50% 52%, rgba(241,244,240,0.78) 0%, rgba(248,249,246,0.91) 58%, rgba(255,255,255,0.99) 100%);
      color: #1f211f;
      box-shadow:
        inset 0 0 0 2px rgba(255,255,255,0.42),
        inset 2px 2px 5px rgba(255,255,255,0.76),
        inset -3px -3px 7px rgba(205,214,204,0.12),
        0 2px 6px rgba(186,193,184,0.08);
      padding: 11px 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 5px;
      text-align: center;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease;
    }

    .ai-assistant-pill:active {
      transform: scale(0.975);
      box-shadow:
        inset 2px 2px 6px rgba(186,193,184,0.12),
        0 1px 4px rgba(186,193,184,0.10);
    }

    .ai-assistant-title {
      color: var(--ai-green);
      font-size: clamp(13.5px, 3.2vw, 18px);
      font-weight: 760;
      line-height: 1.08;
      letter-spacing: -0.018em;
    }

    .ai-assistant-subtitle {
      color: rgba(31,33,31,0.54);
      font-size: clamp(10.5px, 2.45vw, 13.5px);
      font-weight: 560;
      line-height: 1.12;
      letter-spacing: -0.004em;
    }

    .vetting-main-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .vetting-hero {
      border-radius: 24px;
      background:
        radial-gradient(circle at 18% 8%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0) 36%),
        linear-gradient(180deg, rgba(255,255,252,0.96) 0%, rgba(247,249,245,0.94) 100%);
      border: 1px solid rgba(226,231,224,0.74);
      padding: 14px 14px 13px;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.50),
        0 1px 4px rgba(180,188,178,0.035);
    }

    .vetting-label {
      color: rgba(31,33,31,0.50);
      font-size: clamp(10px, 2.25vw, 12.5px);
      font-weight: 760;
      line-height: 1;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      margin-bottom: 7px;
    }

    .vetting-title {
      color: var(--ai-green);
      font-size: clamp(17px, 4vw, 23px);
      font-weight: 760;
      line-height: 1.1;
      letter-spacing: -0.032em;
    }

    .vetting-note {
      margin-top: 7px;
      color: rgba(31,33,31,0.62);
      font-size: clamp(12px, 2.75vw, 15px);
      font-weight: 450;
      line-height: 1.32;
    }

    .vetting-chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
    }

    .vetting-chip {
      min-height: 31px;
      border-radius: 999px;
      border: 1px solid rgba(225,231,224,0.76);
      background: rgba(255,255,255,0.72);
      color: rgba(31,33,31,0.70);
      padding: 0 11px;
      font-size: clamp(10.8px, 2.45vw, 13.5px);
      font-weight: 680;
      line-height: 1;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.52),
        0 1px 3px rgba(180,188,178,0.035);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .vetting-chip.active {
      color: #ffffff;
      background: var(--ai-green);
      border-color: rgba(31,111,86,0.18);
      box-shadow: 0 2px 5px rgba(31,111,86,0.07);
    }

    .vetting-action-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 9px;
    }

    .vetting-action-btn {
      min-height: 42px;
      border-radius: 999px;
      border: 2px solid rgba(255,255,255,0.92);
      background:
        radial-gradient(circle at 50% 52%, rgba(240,243,239,0.80) 0%, rgba(249,250,247,0.94) 56%, rgba(255,255,255,0.99) 100%);
      color: var(--ai-green);
      font-size: clamp(12px, 2.8vw, 15px);
      font-weight: 740;
      box-shadow:
        inset 0 0 0 3px rgba(255,255,255,0.42),
        inset 2px 2px 5px rgba(255,255,255,0.78),
        inset -3px -3px 7px rgba(205,214,204,0.15),
        0 2px 5px rgba(186,193,184,0.08);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .vetting-action-btn.primary {
      background:
        radial-gradient(circle at 50% 52%, rgba(223,237,225,0.94) 0%, rgba(244,249,243,0.97) 56%, rgba(255,255,255,0.99) 100%);
    }

    .vetting-field {
      display: flex;
      flex-direction: column;
      gap: 7px;
      color: rgba(31,33,31,0.58);
      font-size: clamp(11px, 2.5vw, 13.5px);
      font-weight: 680;
      line-height: 1.1;
    }

    .vetting-field textarea {
      width: 100%;
      box-sizing: border-box;
      min-height: 154px;
      resize: vertical;
      border-radius: 22px;
      border: 2px solid rgba(255,255,255,0.88);
      background: rgba(255,255,255,0.62);
      color: #1f211f;
      font-size: clamp(14px, 3.1vw, 18px);
      font-weight: 430;
      line-height: 1.34;
      padding: 13px 14px;
      outline: none;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.40),
        inset 2px 2px 5px rgba(255,255,255,0.60),
        inset -2px -2px 6px rgba(197,207,196,0.10);
    }

    .vetting-field textarea::placeholder {
      color: rgba(119,122,119,0.42);
    }


    .vetting-answer-card {
      display: none;
      border-radius: 22px;
      border: 1px solid rgba(226,231,224,0.74);
      background: rgba(255,255,255,0.66);
      color: rgba(31,33,31,0.82);
      font-size: clamp(13px, 3vw, 17px);
      font-weight: 440;
      line-height: 1.38;
      padding: 13px 14px;
      white-space: pre-wrap;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.46),
        0 1px 4px rgba(180,188,178,0.035);
    }

    .vetting-answer-card.visible {
      display: block;
    }

    .vetting-answer-card.loading {
      color: #1f6f56;
      font-weight: 680;
      text-align: center;
    }

    .vetting-action-btn:disabled {
      opacity: 0.62;
      cursor: default;
    }

    .ai-notice-overlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: rgba(10,20,15,0.28);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding: 16px;
      box-sizing: border-box;
      animation: textAttachBackdropIn 0.12s ease-out;
    }

    .ai-notice-card {
      width: min(420px, 100%);
      border-radius: 26px;
      background: rgba(255,255,252,0.98);
      border: 1px solid rgba(226,231,224,0.84);
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.50),
        0 18px 46px rgba(20,40,30,0.20);
      padding: 18px 16px 14px;
      animation: dictionaryPickerRise 0.16s ease-out;
    }

    .ai-notice-title {
      color: var(--ai-green, #1f6f56);
      font-size: 20px;
      font-weight: 780;
      line-height: 1.1;
      letter-spacing: -0.02em;
      margin-bottom: 7px;
    }

    .ai-notice-text {
      color: rgba(31,33,31,0.70);
      font-size: 15px;
      font-weight: 520;
      line-height: 1.34;
      margin-bottom: 14px;
    }

    .ai-notice-btn {
      width: 100%;
      min-height: 42px;
      border: 0;
      border-radius: 999px;
      background: rgba(95,153,98,0.90);
      color: #ffffff;
      font-size: 15px;
      font-weight: 760;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }



    body.vetting-page-open #brandBtn {
      display: none !important;
    }

    body.vetting-page-open .brand,
    body.vetting-page-open .brand-title,
    body.vetting-page-open .app-brand {
      display: none !important;
    }

    body.vetting-page-open .ai-shell.vetting-shell {
      padding-top: 0 !important;
    }

    .vetting-topline .ai-title {
      white-space: normal;
    }

    .vetting-main-card-clean {
      gap: 10px;
      padding: 12px;
    }

    .vetting-role-row {
      justify-content: center;
    }

    .vetting-mode-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 7px;
      padding: 2px;
      border-radius: 999px;
      background:
        radial-gradient(circle at 50% 52%, rgba(241,244,240,0.74) 0%, rgba(248,249,246,0.88) 58%, rgba(255,255,255,0.98) 100%);
      border: 2px solid rgba(255,255,255,0.90);
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.36),
        inset 2px 2px 4px rgba(255,255,255,0.62),
        inset -2px -2px 5px rgba(205,214,204,0.08),
        0 1px 4px rgba(186,193,184,0.06);
    }

    .vetting-mode-btn {
      min-width: 0;
      min-height: 34px;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: rgba(31,33,31,0.64);
      font-size: clamp(10.5px, 2.45vw, 13.5px);
      font-weight: 720;
      line-height: 1;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .vetting-mode-btn.active {
      color: #ffffff;
      background: var(--ai-green);
      box-shadow: 0 2px 5px rgba(31,111,86,0.07);
    }

    .vetting-workspace {
      min-height: 360px;
    }

    .vetting-work-card {
      display: flex;
      flex-direction: column;
      gap: 11px;
      min-height: 360px;
      border-radius: 24px;
      background:
        radial-gradient(circle at 18% 8%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0) 36%),
        linear-gradient(180deg, rgba(255,255,252,0.96) 0%, rgba(247,249,245,0.94) 100%);
      border: 1px solid rgba(226,231,224,0.74);
      padding: 13px;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.50),
        0 1px 4px rgba(180,188,178,0.035);
    }

    .vetting-work-head {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .vetting-work-kicker {
      color: rgba(31,33,31,0.48);
      font-size: clamp(9.5px, 2.15vw, 12px);
      font-weight: 760;
      line-height: 1;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }

    .vetting-work-title {
      color: var(--ai-green);
      font-size: clamp(17px, 4vw, 23px);
      font-weight: 760;
      line-height: 1.08;
      letter-spacing: -0.032em;
    }

    .vetting-work-note {
      color: rgba(31,33,31,0.58);
      font-size: clamp(12px, 2.75vw, 15px);
      font-weight: 450;
      line-height: 1.32;
    }

    .vetting-question-box {
      flex: 1 1 auto;
      min-height: 135px;
      border-radius: 22px;
      border: 1px solid rgba(226,231,224,0.74);
      background: rgba(255,255,255,0.62);
      color: rgba(31,33,31,0.78);
      font-size: clamp(13px, 3vw, 17px);
      font-weight: 440;
      line-height: 1.38;
      padding: 13px 14px;
      white-space: pre-wrap;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.46),
        0 1px 4px rgba(180,188,178,0.035);
    }

    .vetting-empty-state {
      color: rgba(31,33,31,0.46);
      font-weight: 560;
    }

    .vetting-options-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .vetting-option-btn {
      min-height: 58px;
      border-radius: 18px;
      border: 1px solid rgba(225,231,224,0.76);
      background: rgba(255,255,255,0.64);
      color: rgba(31,33,31,0.72);
      padding: 9px 10px;
      text-align: left;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.52),
        0 1px 3px rgba(180,188,178,0.035);
    }

    .vetting-option-btn span {
      display: block;
      color: var(--ai-green);
      font-size: 13px;
      font-weight: 780;
      line-height: 1;
      margin-bottom: 5px;
    }

    .vetting-option-btn em {
      display: block;
      color: rgba(31,33,31,0.50);
      font-size: clamp(11px, 2.5vw, 13.5px);
      font-style: normal;
      font-weight: 560;
      line-height: 1.18;
    }

    .vetting-action-row.single {
      grid-template-columns: 1fr;
    }

    .vetting-field.compact textarea {
      min-height: 94px;
    }


    body.vetting-page-open {
      overflow: hidden;
    }

    body.vetting-page-open #aiPage {
      overflow: hidden;
    }

    body.vetting-page-open .app {
      padding-top: max(6px, env(safe-area-inset-top)) !important;
    }

    body.vetting-page-open .ai-shell.vetting-shell {
      height: calc(100dvh - max(6px, env(safe-area-inset-top)) - 8px);
      display: flex;
      flex-direction: column;
      padding: 0 4px 8px !important;
      overflow: hidden;
      box-sizing: border-box;
    }

    body.vetting-page-open .vetting-topline {
      min-height: 42px !important;
      padding: 0 8px 4px !important;
      grid-template-columns: 34px minmax(0, 1fr) !important;
      gap: 6px !important;
      flex: 0 0 auto;
    }

    body.vetting-page-open .vetting-topline .ai-back-btn {
      width: 32px !important;
      min-width: 32px !important;
      height: 32px !important;
      font-size: 25px !important;
      transform: translateY(-1px) !important;
    }

    body.vetting-page-open .vetting-topline .ai-title-block {
      transform: translateY(0) !important;
      gap: 0 !important;
    }

    body.vetting-page-open .vetting-topline .ai-title {
      font-size: clamp(19px, 5vw, 27px) !important;
      line-height: 1.02 !important;
      letter-spacing: -0.04em !important;
      white-space: nowrap !important;
    }

    body.vetting-page-open .vetting-topline .ai-subtitle {
      display: none !important;
    }

    body.vetting-page-open .vetting-main-card-clean {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 8px !important;
      padding: 7px !important;
      border-radius: 24px !important;
      overflow: hidden;
      box-sizing: border-box;
    }

    body.vetting-page-open .vetting-role-row {
      flex: 0 0 auto;
      display: grid !important;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 4px !important;
      flex-wrap: nowrap !important;
      justify-content: stretch !important;
    }

    body.vetting-page-open .vetting-role-row .vetting-chip {
      min-width: 0 !important;
      min-height: 28px !important;
      padding: 0 4px !important;
      font-size: clamp(8.8px, 2.25vw, 12px) !important;
      font-weight: 720 !important;
      letter-spacing: -0.02em !important;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    body.vetting-page-open .vetting-mode-row {
      flex: 0 0 auto;
      width: 72%;
      align-self: center;
      min-height: 30px;
      gap: 3px !important;
      padding: 2px !important;
      border-radius: 999px !important;
    }

    body.vetting-page-open .vetting-mode-btn {
      min-height: 26px !important;
      font-size: clamp(9.5px, 2.35vw, 12.5px) !important;
      font-weight: 740 !important;
      padding: 0 4px !important;
    }

    body.vetting-page-open .vetting-workspace {
      flex: 1 1 auto;
      min-height: 0 !important;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    body.vetting-page-open .vetting-work-card {
      flex: 1 1 auto;
      min-height: 0 !important;
      display: flex;
      flex-direction: column;
      gap: 8px !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      overflow: hidden;
    }

    body.vetting-page-open .vetting-work-head,
    body.vetting-page-open .vetting-work-kicker,
    body.vetting-page-open .vetting-work-title,
    body.vetting-page-open .vetting-work-note {
      display: none !important;
    }

    body.vetting-page-open .vetting-compact-input {
      flex: 0 0 auto;
      width: 100%;
      min-height: 54px;
      max-height: 82px;
      resize: none;
      box-sizing: border-box;
      border-radius: 18px;
      border: 2px solid rgba(255,255,255,0.86);
      background: rgba(255,255,255,0.58);
      color: #1f211f;
      font-size: clamp(12.5px, 2.9vw, 16px);
      font-weight: 470;
      line-height: 1.28;
      padding: 10px 12px;
      outline: none;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.40),
        inset 2px 2px 5px rgba(255,255,255,0.60),
        inset -2px -2px 6px rgba(197,207,196,0.10);
    }

    body.vetting-page-open .vetting-compact-input::placeholder {
      color: rgba(119,122,119,0.42);
    }

    body.vetting-page-open .vetting-question-box {
      flex: 1 1 auto;
      min-height: 0 !important;
      overflow: auto !important;
      -webkit-overflow-scrolling: touch;
      border-radius: 22px !important;
      padding: 13px 14px 16px !important;
      font-size: clamp(13.5px, 3.2vw, 17.5px) !important;
      line-height: 1.42 !important;
      white-space: pre-wrap !important;
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
    }

    body.vetting-page-open .vetting-question-box.loading {
      color: #1f6f56;
      font-weight: 680;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    body.vetting-page-open .vetting-action-row {
      flex: 0 0 auto;
      grid-template-columns: 1fr 1fr !important;
      gap: 8px !important;
      padding: 0 18px 2px;
    }

    body.vetting-page-open .vetting-action-btn {
      min-height: 34px !important;
      padding: 0 10px !important;
      font-size: clamp(10.5px, 2.5vw, 13.5px) !important;
      font-weight: 760 !important;
      border-radius: 999px !important;
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


    /* VetAI compact clean cockpit v102 */
    body.vetting-page-open {
      overflow: hidden !important;
    }

    body.vetting-page-open #aiPage {
      overflow: hidden !important;
    }

    body.vetting-page-open .app {
      padding-top: max(0px, env(safe-area-inset-top)) !important;
    }

    body.vetting-page-open .ai-shell.vetting-shell {
      height: calc(100dvh - max(0px, env(safe-area-inset-top)) - 2px) !important;
      padding: 0 4px 4px !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
    }

    body.vetting-page-open .vetting-topline {
      flex: 0 0 auto !important;
      min-height: 34px !important;
      padding: 0 6px 1px !important;
      grid-template-columns: 30px minmax(0, 1fr) !important;
      gap: 5px !important;
      align-items: center !important;
    }

    body.vetting-page-open .vetting-topline .ai-back-btn {
      width: 30px !important;
      min-width: 30px !important;
      height: 30px !important;
      font-size: 24px !important;
      transform: translateY(0) !important;
    }

    body.vetting-page-open .vetting-topline .ai-title-block {
      transform: translateY(0) !important;
      gap: 0 !important;
    }

    body.vetting-page-open .vetting-topline .ai-title {
      font-size: clamp(18px, 4.8vw, 26px) !important;
      line-height: 1 !important;
      letter-spacing: -0.045em !important;
      white-space: nowrap !important;
    }

    body.vetting-page-open .vetting-topline .ai-subtitle {
      display: none !important;
    }

    body.vetting-page-open .vetting-main-card-clean {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 7px !important;
      padding: 0 2px !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
    }

    body.vetting-page-open .vetting-role-row {
      flex: 0 0 auto !important;
      display: grid !important;
      grid-template-columns: 1.05fr 1.15fr 0.72fr 0.98fr 1.05fr !important;
      gap: 4px !important;
      flex-wrap: nowrap !important;
      justify-content: stretch !important;
      padding: 0 1px !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }

    body.vetting-page-open .vetting-role-row .vetting-chip {
      min-width: 0 !important;
      width: 100% !important;
      min-height: 28px !important;
      padding: 0 2px !important;
      font-size: clamp(8px, 2.05vw, 11px) !important;
      font-weight: 730 !important;
      letter-spacing: -0.035em !important;
      overflow: hidden !important;
      text-overflow: clip !important;
      white-space: nowrap !important;
    }

    body.vetting-page-open .vetting-mode-row {
      flex: 0 0 auto !important;
      width: 100% !important;
      align-self: stretch !important;
      display: grid !important;
      grid-template-columns: 1fr 1.18fr 1fr !important;
      min-height: 30px !important;
      gap: 0 !important;
      padding: 1px !important;
      border-radius: 15px !important;
      background:
        radial-gradient(circle at 50% 52%, rgba(241,244,240,0.74) 0%, rgba(248,249,246,0.88) 58%, rgba(255,255,255,0.98) 100%) !important;
      border: 2px solid rgba(255,255,255,0.90) !important;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.36),
        inset 2px 2px 4px rgba(255,255,255,0.62),
        inset -2px -2px 5px rgba(205,214,204,0.08),
        0 1px 4px rgba(186,193,184,0.06) !important;
      box-sizing: border-box !important;
    }

    body.vetting-page-open .vetting-mode-btn {
      min-height: 26px !important;
      height: 26px !important;
      padding: 0 5px !important;
      border-radius: 14px !important;
      border: 2px solid transparent !important;
      background: transparent !important;
      color: #777a77 !important;
      font-size: clamp(10px, 2.45vw, 14px) !important;
      font-weight: 560 !important;
      line-height: 1 !important;
      letter-spacing: 0.01em !important;
      box-shadow: none !important;
    }

    body.vetting-page-open .vetting-mode-btn.active {
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

    body.vetting-page-open .vetting-workspace {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
    }

    body.vetting-page-open .vetting-work-card {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 7px !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      overflow: hidden !important;
    }

    body.vetting-page-open .vetting-work-head,
    body.vetting-page-open .vetting-work-kicker,
    body.vetting-page-open .vetting-work-title,
    body.vetting-page-open .vetting-work-note {
      display: none !important;
    }

    body.vetting-page-open .vetting-compact-input {
      flex: 0 0 auto !important;
      width: 100% !important;
      min-height: 48px !important;
      max-height: 70px !important;
      resize: none !important;
      box-sizing: border-box !important;
      border-radius: 19px !important;
      border: 2px solid rgba(255,255,255,0.86) !important;
      background: rgba(255,255,255,0.58) !important;
      color: #1f211f !important;
      font-size: clamp(12.5px, 2.9vw, 16px) !important;
      font-weight: 470 !important;
      line-height: 1.25 !important;
      padding: 9px 12px !important;
      outline: none !important;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.40),
        inset 2px 2px 5px rgba(255,255,255,0.60),
        inset -2px -2px 6px rgba(197,207,196,0.10) !important;
    }

    body.vetting-page-open .vetting-question-box {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      overflow: auto !important;
      -webkit-overflow-scrolling: touch !important;
      border-radius: 22px !important;
      border: 1px solid rgba(226,231,224,0.74) !important;
      background: rgba(255,255,255,0.62) !important;
      padding: 16px 16px 18px !important;
      color: rgba(31,33,31,0.78) !important;
      font-size: clamp(14px, 3.25vw, 18px) !important;
      font-weight: 440 !important;
      line-height: 1.42 !important;
      white-space: pre-wrap !important;
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.46),
        0 1px 4px rgba(180,188,178,0.035) !important;
    }

    body.vetting-page-open .vetting-question-box.loading {
      color: #1f6f56 !important;
      font-weight: 680 !important;
      text-align: center !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    body.vetting-page-open .vetting-action-row {
      flex: 0 0 auto !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 10px !important;
      padding: 0 34px max(10px, env(safe-area-inset-bottom)) !important;
      box-sizing: border-box !important;
    }

    body.vetting-page-open .vetting-action-btn {
      min-height: 33px !important;
      height: 33px !important;
      padding: 0 10px !important;
      font-size: clamp(10.5px, 2.5vw, 13.5px) !important;
      font-weight: 760 !important;
      border-radius: 999px !important;
      border: 2px solid rgba(255,255,255,0.92) !important;
      background:
        radial-gradient(circle at 50% 52%, rgba(240,243,239,0.80) 0%, rgba(249,250,247,0.94) 56%, rgba(255,255,255,0.99) 100%) !important;
      color: var(--ai-green) !important;
      box-shadow:
        inset 0 0 0 3px rgba(255,255,255,0.42),
        inset 2px 2px 5px rgba(255,255,255,0.78),
        inset -3px -3px 7px rgba(205,214,204,0.15),
        0 2px 5px rgba(186,193,184,0.08) !important;
    }

    body.vetting-page-open .vetting-action-btn.primary {
      background:
        radial-gradient(circle at 50% 52%, rgba(240,243,239,0.80) 0%, rgba(249,250,247,0.94) 56%, rgba(255,255,255,0.99) 100%) !important;
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



    /* VetAI cards structured EN/RU swipe */
    body.vetting-page-open .vetting-question-box.structured {
      padding: 0 !important;
      overflow: hidden !important;
    }

    .vetting-card-shell {
      width: 100%;
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .vetting-lang-tabs {
      flex: 0 0 auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      margin: -1px -1px 0;
      padding: 1px;
      border-radius: 22px 22px 15px 15px;
      background:
        radial-gradient(circle at 50% 52%, rgba(241,244,240,0.78) 0%, rgba(248,249,246,0.91) 58%, rgba(255,255,255,0.99) 100%);
      border: 2px solid rgba(255,255,255,0.92);
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.38),
        inset 2px 2px 4px rgba(255,255,255,0.64),
        inset -2px -2px 5px rgba(205,214,204,0.08),
        0 1px 4px rgba(186,193,184,0.05);
    }

    .vetting-lang-btn {
      height: 25px;
      border: 2px solid transparent;
      border-radius: 14px;
      background: transparent;
      color: #777a77;
      font-size: clamp(10px, 2.35vw, 13px);
      font-weight: 700;
      letter-spacing: 0.04em;
      line-height: 1;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .vetting-lang-btn.active {
      color: #5f9962;
      background:
        radial-gradient(circle at 50% 52%, rgba(240,243,239,0.80) 0%, rgba(249,250,247,0.94) 56%, rgba(255,255,255,0.99) 100%);
      border-color: rgba(255,255,255,0.94);
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.38),
        inset 2px 2px 4px rgba(255,255,255,0.70),
        inset -2px -2px 5px rgba(205,214,204,0.10),
        0 1px 4px rgba(186,193,184,0.055);
    }

    .vetting-lang-frame {
      flex: 1 1 auto;
      min-height: 0;
      width: 100%;
      overflow: hidden;
      touch-action: pan-y;
      margin-top: 0;
    }

    .vetting-lang-track {
      height: 100%;
      width: 200%;
      display: flex;
      transition: transform 0.24s ease;
      will-change: transform;
    }

    .vetting-card-shell.lang-ru .vetting-lang-track {
      transform: translateX(-50%);
    }

    .vetting-card-panel {
      width: 50%;
      flex: 0 0 50%;
      min-width: 0;
      height: 100%;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      padding: 9px 14px 18px;
      box-sizing: border-box;
    }

    .vetting-card-topic {
      display: inline-flex;
      max-width: 100%;
      margin: 0 0 8px;
      padding: 3px 9px;
      border-radius: 999px;
      background: rgba(95,153,98,0.09);
      color: #1f6f56;
      font-size: clamp(10px, 2.25vw, 12.2px);
      font-weight: 720;
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .vetting-card-label {
      color: rgba(31,33,31,0.50);
      font-size: clamp(10px, 2.25vw, 12.5px);
      font-weight: 780;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin: 0 0 8px;
    }

    .vetting-card-main-text {
      color: rgba(31,33,31,0.84);
      font-size: clamp(17px, 4.15vw, 24px);
      font-weight: 620;
      line-height: 1.30;
      letter-spacing: -0.025em;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .vetting-card-section {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid rgba(224,228,222,0.68);
    }

    .vetting-card-section-title {
      color: #1f6f56;
      font-size: clamp(12px, 2.75vw, 15px);
      font-weight: 760;
      line-height: 1.15;
      margin: 0 0 7px;
    }

    .vetting-card-list {
      margin: 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      color: rgba(31,33,31,0.76);
      font-size: clamp(13px, 3vw, 17px);
      font-weight: 470;
      line-height: 1.34;
    }

    .vetting-card-small-text {
      color: rgba(31,33,31,0.72);
      font-size: clamp(13px, 3vw, 17px);
      font-weight: 470;
      line-height: 1.34;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .vetting-card-warning {
      margin-top: 13px;
      padding: 10px 11px;
      border-radius: 16px;
      background: rgba(150,48,45,0.055);
      color: rgba(120,42,39,0.88);
      font-size: clamp(12.5px, 2.85vw, 16px);
      font-weight: 520;
      line-height: 1.32;
    }

    /* VetAI v103 final polish: raise header and align bottom buttons */
    body.vetting-page-open .app {
      padding-top: 0 !important;
    }

    body.vetting-page-open .ai-shell.vetting-shell {
      height: calc(100dvh - 2px) !important;
      padding-top: 0 !important;
    }

    body.vetting-page-open .vetting-topline {
      min-height: 30px !important;
      padding: 0 6px 0 !important;
      margin-top: -8px !important;
      margin-bottom: 1px !important;
      align-items: center !important;
    }

    body.vetting-page-open .vetting-topline .ai-back-btn {
      width: 29px !important;
      min-width: 29px !important;
      height: 29px !important;
      font-size: 24px !important;
      transform: translateY(0) !important;
    }

    body.vetting-page-open .vetting-topline .ai-title {
      font-size: clamp(18px, 4.7vw, 25px) !important;
      line-height: 0.98 !important;
    }

    body.vetting-page-open .vetting-main-card-clean {
      gap: 6px !important;
      padding-top: 0 !important;
    }

    body.vetting-page-open .vetting-role-row {
      margin-top: 0 !important;
      margin-bottom: 0 !important;
    }

    body.vetting-page-open .vetting-mode-row {
      margin-top: 0 !important;
      margin-bottom: 0 !important;
    }

    body.vetting-page-open .vetting-work-card {
      gap: 6px !important;
    }

    body.vetting-page-open .vetting-question-box {
      padding-top: 15px !important;
      padding-bottom: 16px !important;
    }

    body.vetting-page-open .vetting-action-row {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      align-items: stretch !important;
      gap: 10px !important;
      padding: 0 34px max(10px, env(safe-area-inset-bottom)) !important;
      margin: 0 !important;
    }

    body.vetting-page-open .vetting-action-row.single {
      grid-template-columns: 1fr !important;
    }

    body.vetting-page-open .vetting-action-btn,
    body.vetting-page-open .vetting-action-btn.primary {
      width: 100% !important;
      height: 36px !important;
      min-height: 36px !important;
      max-height: 36px !important;
      margin: 0 !important;
      padding: 0 10px !important;
      box-sizing: border-box !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      text-align: center !important;
      vertical-align: middle !important;
      line-height: 1.05 !important;
      white-space: normal !important;
    }
    /* VetAI v106 hard snap: EN/RU is the fixed header of the result window */
    body.vetting-page-open .vetting-question-box.structured {
      position: relative !important;
      display: block !important;
      align-items: initial !important;
      justify-content: initial !important;
      padding: 0 !important;
      overflow: hidden !important;
      border-radius: 22px !important;
    }

    body.vetting-page-open .vetting-question-box.structured .vetting-card-shell {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      min-height: 0 !important;
      display: block !important;
      overflow: hidden !important;
      background: transparent !important;
    }

    body.vetting-page-open .vetting-question-box.structured .vetting-lang-tabs {
      position: absolute !important;
      top: -1px !important;
      left: -1px !important;
      right: -1px !important;
      z-index: 20 !important;
      margin: 0 !important;
      padding: 1px !important;
      height: 34px !important;
      min-height: 34px !important;
      box-sizing: border-box !important;
      border-radius: 22px 22px 15px 15px !important;
    }

    body.vetting-page-open .vetting-question-box.structured .vetting-lang-btn {
      height: 28px !important;
      min-height: 28px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      line-height: 1 !important;
    }

    body.vetting-page-open .vetting-question-box.structured .vetting-lang-frame {
      position: absolute !important;
      left: 0 !important;
      right: 0 !important;
      top: 34px !important;
      bottom: 0 !important;
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      overflow: hidden !important;
    }

    body.vetting-page-open .vetting-question-box.structured .vetting-lang-track {
      height: 100% !important;
      min-height: 0 !important;
    }

    body.vetting-page-open .vetting-question-box.structured .vetting-card-panel {
      height: 100% !important;
      min-height: 0 !important;
      overflow: auto !important;
      -webkit-overflow-scrolling: touch !important;
      padding: 8px 14px 18px !important;
      box-sizing: border-box !important;
    }

    body.vetting-page-open .vetting-question-box.structured .vetting-card-topic {
      margin: 0 0 8px !important;
    }

    body.vetting-page-open .vetting-question-box.structured .vetting-card-label {
      display: none !important;
    }


    /* VetAI v107 structural fix: no top void, clean frame, fixed EN/RU header */
    body.vetting-page-open .vetting-question-box.structured {
      position: relative !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: stretch !important;
      justify-content: flex-start !important;
      padding: 0 !important;
      overflow: hidden !important;
      border-radius: 22px !important;
      box-sizing: border-box !important;
    }

    body.vetting-page-open .vetting-question-box.structured .vetting-card-shell {
      position: relative !important;
      inset: auto !important;
      width: 100% !important;
      height: 100% !important;
      min-height: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      background: transparent !important;
    }

    body.vetting-page-open .vetting-question-box.structured .vetting-lang-tabs {
      position: relative !important;
      top: auto !important;
      left: auto !important;
      right: auto !important;
      z-index: 20 !important;
      flex: 0 0 auto !important;
      width: calc(100% + 2px) !important;
      margin: -1px -1px 0 !important;
      padding: 1px !important;
      height: 34px !important;
      min-height: 34px !important;
      box-sizing: border-box !important;
      border-radius: 22px 22px 15px 15px !important;
    }

    body.vetting-page-open .vetting-question-box.structured .vetting-lang-frame {
      position: relative !important;
      left: auto !important;
      right: auto !important;
      top: auto !important;
      bottom: auto !important;
      flex: 1 1 auto !important;
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
    }

    body.vetting-page-open .vetting-question-box.structured .vetting-lang-track {
      height: 100% !important;
      min-height: 0 !important;
    }

    body.vetting-page-open .vetting-question-box.structured .vetting-card-panel {
      height: 100% !important;
      min-height: 0 !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      -webkit-overflow-scrolling: touch !important;
      padding: 7px 14px 18px !important;
      box-sizing: border-box !important;
    }

    body.vetting-page-open .vetting-question-box.structured .vetting-card-topic {
      display: inline-flex !important;
      margin: 0 0 7px !important;
      max-width: 100% !important;
    }

    body.vetting-page-open .vetting-question-box.structured .vetting-card-main-text {
      margin: 0 !important;
      padding: 0 !important;
      font-size: clamp(16px, 3.85vw, 22px) !important;
      line-height: 1.28 !important;
    }

    body.vetting-page-open .vetting-question-box.structured .vetting-card-label {
      display: none !important;
    }


    /* VetAI v108 fixes: keep last card for answer and remove top void under EN/RU */
    body.vetting-page-open .vetting-question-box.structured .vetting-lang-tabs {
      flex: 0 0 34px !important;
      height: 34px !important;
      min-height: 34px !important;
      margin: -1px -1px 0 !important;
    }

    body.vetting-page-open .vetting-question-box.structured .vetting-lang-frame {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }

    body.vetting-page-open .vetting-question-box.structured .vetting-card-panel {
      display: block !important;
      height: 100% !important;
      min-height: 0 !important;
      padding: 0 14px 18px !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
    }

    body.vetting-page-open .vetting-question-box.structured .vetting-card-topic {
      margin: 7px 0 7px !important;
    }

    body.vetting-page-open .vetting-question-box.structured .vetting-card-main-text {
      margin: 0 !important;
      padding: 0 !important;
    }


    /* VetAI v110 answer cleanup: smaller answer text, clean missing state, no escaped newline look */
    body.vetting-page-open .vetting-question-box.structured .vetting-card-answer-text {
      font-size: clamp(13.5px, 3.05vw, 17.5px) !important;
      font-weight: 500 !important;
      line-height: 1.38 !important;
      letter-spacing: -0.01em !important;
    }

    body.vetting-page-open .vetting-question-box.structured .vetting-card-missing {
      margin-top: 8px !important;
      color: rgba(31,33,31,0.58) !important;
      font-size: clamp(12.5px, 2.85vw, 15.5px) !important;
      font-weight: 520 !important;
      line-height: 1.34 !important;
    }

    body.vetting-page-open .vetting-question-box.structured .vetting-card-section {
      margin-top: 12px !important;
      padding-top: 10px !important;
    }

    body.vetting-page-open .vetting-question-box.structured .vetting-card-list {
      font-size: clamp(12.5px, 2.85vw, 16px) !important;
      line-height: 1.32 !important;
      gap: 5px !important;
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
    meta: normalizeWordMeta(item.meta),
    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    updatedAt: item.updatedAt || item.updated_at || new Date().toISOString()
  };
}

function normalizeWordMeta(meta) {
  if (!meta) return {};

  if (typeof meta === "string") {
    try {
      const parsed = JSON.parse(meta);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  if (typeof meta === "object" && !Array.isArray(meta)) {
    return { ...meta };
  }

  return {};
}

function getWordFullCardMeta(wordItem) {
  const meta = normalizeWordMeta(wordItem?.meta);
  const fullCard = meta.fullCard && typeof meta.fullCard === "object" && !Array.isArray(meta.fullCard)
    ? meta.fullCard
    : null;

  return fullCard;
}

function isWordFullCardReady(wordItem) {
  const fullCard = getWordFullCardMeta(wordItem);
  return Boolean(fullCard && fullCard.status === "ready" && (fullCard.center || fullCard.left || fullCard.right));
}

function isWordFullCardLoading(wordItem) {
  const fullCard = getWordFullCardMeta(wordItem);
  return Boolean(fullCard && fullCard.status === "loading");
}

async function bootstrapDictionaries() {
  if (publicDictionaryMode) return;
  if (!getAccessToken()) return;

  const localDictionaries = loadDictionaries();

  try {
    const data = await dictionaryApi("/api/dictionaries", {
      method: "GET"
    });

    if (publicDictionaryMode) return;

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

      if (publicDictionaryMode) return;

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
    if (publicDictionaryMode) return;
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

async function createDictionaryPublicLinkInCloud(dictionaryId) {
  return await dictionaryApi(`/api/dictionaries/${encodeURIComponent(dictionaryId)}/public-link`, {
    method: "POST"
  });
}

async function loadPublicDictionaryFromCloud(shareId) {
  let res;

  try {
    res = await fetch(`${API_BASE}/public/dictionary/${encodeURIComponent(shareId)}`, {
      method: "GET"
    });
  } catch (err) {
    throw new Error("Не удалось загрузить публичный словарь. Проверь интернет и Worker.\n" + err.message);
  }

  return await readJsonOrThrow(res);
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
      partOfSpeech: wordItem.partOfSpeech,
      meta: normalizeWordMeta(wordItem.meta)
    })
  });
}

async function updateWordMetaInCloud(dictionaryId, wordId, meta) {
  return await dictionaryApi(`/api/dictionaries/${encodeURIComponent(dictionaryId)}/words/${encodeURIComponent(wordId)}/meta`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      meta: normalizeWordMeta(meta)
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

function queueDictionaryWordFullCardEnrichment(dictionaryId, wordId) {
  if (!dictionaryId || !wordId) return;

  const dict = dictionaries.find((item) => item.id === dictionaryId);
  const wordItem = dict?.words?.find((item) => item.id === wordId);

  if (!dict || !wordItem) return;
  if (isWordFullCardReady(wordItem) || isWordFullCardLoading(wordItem)) return;

  enrichDictionaryWordFullCard(dictionaryId, wordId).catch((err) => {
    console.warn("Dictionary word enrichment failed:", wordItem.word, err);
  });
}

async function enrichDictionaryWordFullCard(dictionaryId, wordId) {
  const dict = dictionaries.find((item) => item.id === dictionaryId);
  const wordItem = dict?.words?.find((item) => item.id === wordId);

  if (!dict || !wordItem) return null;
  if (isWordFullCardReady(wordItem)) return getWordFullCardMeta(wordItem);

  const sourceWord = String(wordItem.word || "").trim();
  if (!sourceWord) return null;

  const startedAt = new Date().toISOString();
  wordItem.meta = {
    ...normalizeWordMeta(wordItem.meta),
    fullCard: {
      status: "loading",
      startedAt,
      updatedAt: startedAt
    }
  };
  wordItem.updatedAt = startedAt;
  dict.updatedAt = startedAt;
  saveDictionaries();

  try {
    await updateWordMetaInCloud(dictionaryId, wordId, wordItem.meta);
  } catch (err) {
    console.warn("Saving dictionary word loading meta failed:", sourceWord, err);
  }

  const [centerResult, leftResult, rightResult] = await Promise.allSettled([
    callAi("word_translate", sourceWord),
    callAi("word_left", sourceWord),
    callAi("word_right", sourceWord)
  ]);

  const centerData = centerResult.status === "fulfilled" ? centerResult.value : null;
  const leftData = leftResult.status === "fulfilled" ? leftResult.value : null;
  const rightData = rightResult.status === "fulfilled" ? rightResult.value : null;

  const centerCard = centerData ? getStructuredWordCardFromAiData(centerData) : null;
  const leftPayload = leftData ? getWordLeftPayloadFromAiData(leftData) : null;
  const rightPayload = rightData ? getWordRightPayloadFromAiData(rightData) : null;

  const errors = [];
  if (centerResult.status === "rejected") errors.push({ panel: "center", message: String(centerResult.reason?.message || centerResult.reason || "") });
  if (leftResult.status === "rejected") errors.push({ panel: "left", message: String(leftResult.reason?.message || leftResult.reason || "") });
  if (rightResult.status === "rejected") errors.push({ panel: "right", message: String(rightResult.reason?.message || rightResult.reason || "") });

  const updatedAt = new Date().toISOString();
  const fullCard = {
    status: centerCard || leftPayload || rightPayload ? "ready" : "error",
    source: sourceWord,
    center: centerCard || (centerData ? { raw: centerData.result || centerData.raw || "" } : null),
    left: leftPayload || (leftData ? { raw: leftData.result || leftData.raw || "" } : null),
    right: rightPayload || (rightData ? { raw: rightData.result || rightData.raw || "" } : null),
    errors,
    startedAt,
    updatedAt
  };

  wordItem.meta = {
    ...normalizeWordMeta(wordItem.meta),
    fullCard
  };
  wordItem.updatedAt = updatedAt;
  dict.updatedAt = updatedAt;
  saveDictionaries();

  try {
    const saved = await updateWordMetaInCloud(dictionaryId, wordId, wordItem.meta);
    const savedWord = saved.word ? normalizeWordFromApi(saved.word) : null;

    if (savedWord) {
      Object.assign(wordItem, savedWord);
      saveDictionaries();
    }
  } catch (err) {
    console.warn("Saving dictionary word full card failed:", sourceWord, err);
  }

  return fullCard;
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
    queueDictionaryWordFullCardEnrichment(dictionaryId, existing.id);
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
    queueDictionaryWordFullCardEnrichment(dictionaryId, wordItem.id);
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

function iconPaperclip() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.4 12.4 14.9 5.9c1.8-1.8 4.6-1.8 6.2 0 1.7 1.8 1.6 4.6-.2 6.4l-8.2 8.2c-2.4 2.4-6.2 2.4-8.5 0-2.3-2.4-2.2-6.2.2-8.6l8.1-8.1"/><path d="M15.3 9.2 7.9 16.6c-.8.8-.8 2.1 0 2.9.8.8 2.1.8 2.9 0l7.8-7.8"/></svg>`;
}

function iconGallery() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2.4"/><circle cx="8.5" cy="9.2" r="1.4"/><path d="M5.8 16.8 10.2 12.4l3.1 3.1 2.1-2.1 3.1 3.4"/></svg>`;
}

function iconFileText() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.8h6.7L18 8.1v12.1H7V3.8Z"/><path d="M13.7 3.8v4.6H18"/><path d="M9.6 12h5.8"/><path d="M9.6 15h5.8"/><path d="M9.6 18h3.8"/></svg>`;
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
      <button class="text-bottom-icon-btn text-attach-btn" type="button" title="Добавить фото или файл">${iconCamera()}</button>
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


function handleTextAttachMenu(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  handleTextImageExtractSource("gallery");
}

function openTextAttachMenu(anchorBtn) {
  closeTextAttachMenu();

  const rect = anchorBtn.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const baseY = rect.top + rect.height / 2;

  const backdrop = document.createElement("div");
  backdrop.id = "textAttachMenuBackdrop";
  backdrop.className = "text-attach-menu-backdrop";

  const menu = document.createElement("div");
  menu.id = "textAttachMenu";
  menu.className = "text-attach-menu";
  menu.style.left = `${centerX}px`;
  menu.style.top = `${baseY}px`;

  const items = [
    {
      title: "Файл",
      icon: iconFileText(),
      offset: -36,
      primary: true,
      action: () => handleTextFileExtractSource()
    },
    {
      title: "Медиатека",
      icon: iconGallery(),
      offset: -88,
      action: () => handleTextImageExtractSource("gallery")
    },
    {
      title: "Фото",
      icon: iconCamera(),
      offset: -138,
      action: () => handleTextImageExtractSource("camera")
    }
  ];

  items.forEach((item) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = item.primary ? "text-attach-option primary" : "text-attach-option";
    option.title = item.title;
    option.style.top = `${item.offset}px`;
    option.style.transform = "translate(-50%, 0)";
    option.innerHTML = item.icon;
    option.onclick = (optionEvent) => {
      optionEvent.preventDefault();
      optionEvent.stopPropagation();
      closeTextAttachMenu();
      item.action();
    };
    menu.appendChild(option);
  });

  backdrop.onclick = () => closeTextAttachMenu();
  document.body.appendChild(backdrop);
  document.body.appendChild(menu);

  document.querySelectorAll(".text-attach-btn").forEach((btn) => btn.classList.add("open"));
}

function closeTextAttachMenu() {
  const backdrop = document.getElementById("textAttachMenuBackdrop");
  const menu = document.getElementById("textAttachMenu");

  if (backdrop) backdrop.remove();
  if (menu) menu.remove();

  document.querySelectorAll(".text-attach-btn").forEach((btn) => btn.classList.remove("open"));
}

async function handleTextImageExtractSource(sourceType = "camera") {
  if (!ensureAccessToken()) return;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = false;

  if (sourceType === "camera") {
    input.setAttribute("capture", "environment");
  } else {
    input.removeAttribute("capture");
  }

  input.style.position = "fixed";
  input.style.left = "-9999px";
  input.style.top = "0";
  input.style.opacity = "0";

  input.onchange = async () => {
    const file = input.files && input.files[0];
    input.remove();

    if (!file) return;

    await extractTextFromPhotoToTextMode(file);
  };

  document.body.appendChild(input);
  input.click();
}

function handleTextFileExtractSource() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = [
    "text/plain",
    ".txt",
    ".md",
    ".csv",
    ".json",
    ".html",
    ".htm",
    ".srt",
    ".vtt",
    ".pdf",
    ".doc",
    ".docx",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ].join(",");

  input.style.position = "fixed";
  input.style.left = "-9999px";
  input.style.top = "0";

  input.onchange = async () => {
    const file = input.files && input.files[0];
    input.remove();

    if (!file) return;

    await handleTextPickedFile(file);
  };

  document.body.appendChild(input);
  input.click();
}

async function handleTextPickedFile(file) {
  if (!file) return;

  setTextDataBusy(true);
  setTextWordMiniDisplay("Обработка данных...", "loading");
  resetTextCopyState();
  clearSelectedTextWord();

  try {
    const name = String(file.name || "").toLowerCase();
    const mime = String(file.type || "").toLowerCase();
    const isTextLike =
      mime.startsWith("text/") ||
      [".txt", ".md", ".csv", ".json", ".html", ".htm", ".srt", ".vtt"].some((ext) => name.endsWith(ext));

    if (isTextLike) {
      const content = await readTextFile(file);
      const cleanText = String(content || "").trim();

      if (!cleanText) {
        alert("Файл пустой или текст не прочитан.");
        return;
      }

      insertExtractedTextIntoTextSource(cleanText);
      setTextWordMiniDisplay("Текст добавлен", "ready");

      window.setTimeout(() => {
        if (String(document.getElementById("textWordMiniDisplay")?.textContent || "") === "Текст добавлен") {
          setTextWordMiniDisplay("");
        }
      }, 900);

      return;
    }

    setTextWordMiniDisplay("Файл выбран", "ready");

    window.setTimeout(() => {
      if (String(document.getElementById("textWordMiniDisplay")?.textContent || "") === "Файл выбран") {
        setTextWordMiniDisplay("PDF/DOCX — через раздел «Файлы»", "ready");
      }
    }, 650);

    window.setTimeout(() => {
      if (String(document.getElementById("textWordMiniDisplay")?.textContent || "") === "PDF/DOCX — через раздел «Файлы»") {
        setTextWordMiniDisplay("");
      }
    }, 2200);
  } catch (err) {
    alert("Не удалось обработать данные:\n" + err.message);
  } finally {
    setTextDataBusy(false);
    updateTextCopyFeedback();
    updateTextInlineClearVisibility();
  }
}

function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл."));

    reader.readAsText(file);
  });
}

async function extractTextFromPhotoToTextMode(file) {
  const mime = String(file?.type || "").toLowerCase();

  if (!file) return;

  if (mime && !mime.startsWith("image/")) {
    alert("Нужно выбрать фото или картинку.");
    return;
  }

  setTextDataBusy(true);
  setTextWordMiniDisplay("Обработка данных...", "loading");
  resetTextCopyState();
  clearSelectedTextWord();

  try {
    const extractedText = await requestImageTextExtract(file);
    const cleanText = String(extractedText || "").trim();

    if (!cleanText) {
      alert("Текст не распознан.");
      return;
    }

    insertExtractedTextIntoTextSource(cleanText);
    setTextWordMiniDisplay("Текст добавлен", "ready");

    window.setTimeout(() => {
      if (String(document.getElementById("textWordMiniDisplay")?.textContent || "") === "Текст добавлен") {
        setTextWordMiniDisplay("");
      }
    }, 900);
  } catch (err) {
    alert("Не удалось обработать данные:\n" + err.message);
  } finally {
    setTextDataBusy(false);
    updateTextCopyFeedback();
    updateTextInlineClearVisibility();
  }
}

async function requestImageTextExtract(file) {
  const formData = new FormData();
  formData.append("file", file, file.name || "photo.jpg");

  const res = await fetch(`${API_BASE}/api/vision/extract-text`, {
    method: "POST",
    headers: authHeaders(),
    body: formData
  });

  const data = await readJsonOrThrow(res);

  return String(data.text || data.result || "").trim();
}

function insertExtractedTextIntoTextSource(extractedText) {
  const cleanText = String(extractedText || "").trim();

  if (!cleanText) return;

  let textInput = document.getElementById("textInput");

  if (!textInput) {
    clearTextMode();

    requestAnimationFrame(() => {
      const nextInput = document.getElementById("textInput");

      if (!nextInput) return;

      nextInput.value = cleanText;
      textSourceValue = cleanText;
      resetTextCopyState();
      updateTextInlineClearVisibility();
      updateTextCopyFeedback();
      switchTextPanel("source");
      nextInput.focus();
    });

    return;
  }

  const currentValue = String(textInput.value || "").trim();
  const nextValue = currentValue ? `${currentValue}\n\n${cleanText}` : cleanText;

  textInput.value = nextValue;
  textSourceValue = nextValue;
  resetTextCopyState();
  updateTextInlineClearVisibility();
  updateTextCopyFeedback();
  switchTextPanel("source");
  textInput.focus();
}

function setTextProcessingOverlay(isVisible, text = "Обработка данных...") {
  const sourcePanel = document.querySelector('[data-text-panel="source"]');
  if (!sourcePanel) return;

  let overlay = document.getElementById("textProcessingOverlay");

  if (!isVisible) {
    if (overlay) overlay.remove();
    return;
  }

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "textProcessingOverlay";
    overlay.className = "text-processing-overlay";
    sourcePanel.appendChild(overlay);
  }

  overlay.textContent = text;
}

function setTextDataBusy(isBusy) {
  const busy = Boolean(isBusy);

  document.querySelectorAll(".text-attach-btn").forEach((btn) => {
    btn.disabled = busy;
    btn.classList.toggle("inactive", busy);
    btn.title = busy ? "Обработка данных..." : "Добавить данные";
  });

  setTextProcessingOverlay(busy, "Обработка данных...");
  updateTextMicButtonsUI();
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

  document.querySelectorAll(".text-attach-btn").forEach((btn) => {
    btn.onclick = handleTextAttachMenu;
  });

  document.querySelectorAll(".text-mic-btn").forEach((btn) => {
    btn.onclick = handleTextMicToggle;
  });

  updateTextMicButtonsUI();

  document.querySelectorAll(".text-copy-btn").forEach((btn) => {
    btn.onclick = copyActiveTextPanel;
  });

  updateTextCopyFeedback();
  updateTextInlineClearVisibility();
}


async function handleTextMicToggle(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (textAudioIsProcessing) return;

  if (textAudioIsRecording) {
    stopTextAudioRecording();
    return;
  }

  await startTextAudioRecording();
}

async function startTextAudioRecording() {
  if (!ensureAccessToken()) return;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Микрофон недоступен в этом браузере.");
    return;
  }

  if (typeof MediaRecorder === "undefined") {
    alert("Запись голоса не поддерживается в этом браузере.");
    return;
  }

  try {
    closeTextAttachMenu();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const options = getTextAudioRecorderOptions();
    const recorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);

    textAudioStream = stream;
    textAudioRecorder = recorder;
    textAudioChunks = [];
    textAudioRecordingStartedAt = Date.now();
    textAudioIsRecording = true;
    textAudioIsProcessing = false;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        textAudioChunks.push(event.data);
      }
    };

    recorder.onerror = () => {
      finishTextAudioStream();
      textAudioIsRecording = false;
      textAudioIsProcessing = false;
      setTextWordMiniDisplay("Ошибка записи", "ready");
      setTextProcessingOverlay(false);
      updateTextMicButtonsUI();
    };

    recorder.onstop = async () => {
      const chunks = textAudioChunks.slice();
      const mimeType = recorder.mimeType || options?.mimeType || "audio/webm";

      finishTextAudioStream();
      textAudioIsRecording = false;
      textAudioRecorder = null;
      textAudioChunks = [];
      updateTextMicButtonsUI();

      await processRecordedTextAudio(chunks, mimeType);
    };

    recorder.start();
    setTextWordMiniDisplay("Идёт запись...", "ready");
    setTextProcessingOverlay(true, "Идёт запись...");
    updateTextMicButtonsUI();
  } catch (err) {
    finishTextAudioStream();
    textAudioIsRecording = false;
    textAudioIsProcessing = false;
    textAudioRecorder = null;
    textAudioChunks = [];
    setTextProcessingOverlay(false);
    updateTextMicButtonsUI();
    alert("Не удалось включить микрофон:\n" + (err?.message || err));
  }
}

function stopTextAudioRecording() {
  if (!textAudioRecorder || textAudioRecorder.state === "inactive") {
    finishTextAudioStream();
    textAudioIsRecording = false;
    updateTextMicButtonsUI();
    return;
  }

  try {
    textAudioRecorder.stop();
  } catch {
    finishTextAudioStream();
    textAudioIsRecording = false;
    textAudioRecorder = null;
    updateTextMicButtonsUI();
  }
}

async function processRecordedTextAudio(chunks, mimeType) {
  if (!chunks || !chunks.length) {
    setTextProcessingOverlay(false);
    setTextWordMiniDisplay("Запись пустая", "ready");
    updateTextMicButtonsUI();
    return;
  }

  textAudioIsProcessing = true;
  setTextDataBusy(true);
  setTextWordMiniDisplay("Обработка данных...", "loading");
  resetTextCopyState();
  clearSelectedTextWord();
  updateTextMicButtonsUI();

  try {
    const audioBlob = new Blob(chunks, { type: mimeType || "audio/webm" });

    if (!audioBlob.size) {
      alert("Запись пустая.");
      return;
    }

    const fileName = makeTextAudioFileName(mimeType);
    const audioFile = new File([audioBlob], fileName, { type: audioBlob.type || mimeType || "audio/webm" });
    const transcript = await requestAudioTranscribe(audioFile);
    const cleanText = String(transcript || "").trim();

    if (!cleanText) {
      alert("Голос не распознан.");
      return;
    }

    insertExtractedTextIntoTextSource(cleanText);
    setTextWordMiniDisplay("Текст добавлен", "ready");

    window.setTimeout(() => {
      if (String(document.getElementById("textWordMiniDisplay")?.textContent || "") === "Текст добавлен") {
        setTextWordMiniDisplay("");
      }
    }, 900);
  } catch (err) {
    alert("Не удалось обработать голос:\n" + (err?.message || err));
  } finally {
    textAudioIsProcessing = false;
    setTextDataBusy(false);
    setTextProcessingOverlay(false);
    updateTextMicButtonsUI();
    updateTextCopyFeedback();
    updateTextInlineClearVisibility();
  }
}

async function requestAudioTranscribe(file) {
  const formData = new FormData();
  formData.append("file", file, file.name || "recording.webm");

  const res = await fetch(`${API_BASE}/api/audio/transcribe`, {
    method: "POST",
    headers: authHeaders(),
    body: formData
  });

  const data = await readJsonOrThrow(res);

  return String(data.text || data.result || "").trim();
}

function getTextAudioRecorderOptions() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
    "audio/wav"
  ];

  if (!window.MediaRecorder || typeof MediaRecorder.isTypeSupported !== "function") {
    return null;
  }

  const supported = candidates.find((type) => MediaRecorder.isTypeSupported(type));

  return supported ? { mimeType: supported } : null;
}

function makeTextAudioFileName(mimeType = "") {
  const clean = String(mimeType || "").toLowerCase();

  if (clean.includes("mp4")) return "recording.m4a";
  if (clean.includes("mpeg") || clean.includes("mp3")) return "recording.mp3";
  if (clean.includes("wav")) return "recording.wav";
  if (clean.includes("ogg")) return "recording.ogg";
  if (clean.includes("webm")) return "recording.webm";

  return "recording.webm";
}

function finishTextAudioStream() {
  if (textAudioStream) {
    textAudioStream.getTracks().forEach((track) => {
      try { track.stop(); } catch {}
    });
  }

  textAudioStream = null;
}

function updateTextMicButtonsUI() {
  document.querySelectorAll(".text-mic-btn").forEach((btn) => {
    btn.classList.toggle("recording", textAudioIsRecording);
    btn.classList.toggle("processing", textAudioIsProcessing);
    btn.disabled = textAudioIsProcessing;

    if (textAudioIsRecording) {
      btn.title = "Остановить запись";
    } else if (textAudioIsProcessing) {
      btn.title = "Обработка данных...";
    } else {
      btn.title = "Голос";
    }
  });
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
  document.body.classList.remove("vetting-page-open");

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

  renderAiHubPage();
  showExistingPage(aiPage);
}

function renderAiHubPage() {
  if (!aiPage) return;

  document.body.classList.remove("vetting-page-open");

  const assistants = [
    { title: "Сбор словаря", subtitle: "создание карточек", action: "soon" },
    { title: "Запомнить слова", subtitle: "ассоциации и образы", action: "soon" },
    { title: "Тренировка слов", subtitle: "проверка и повторение", action: "soon" },
    { title: "Разбор текста", subtitle: "смысл и перевод", action: "soon" },
    { title: "Грамматика", subtitle: "правила с примерами", action: "soon" },
    { title: "Разговор", subtitle: "тренажёр диалога", action: "soon" },
    { title: "Письма", subtitle: "сообщения и email", action: "soon" },
    { title: "Vetting Inspector", subtitle: "English preparation", action: "vetting" }
  ];

  aiPage.innerHTML = `
    <section class="ai-shell">
      <div class="ai-topline">
        <button id="backHomeFromAiBtn" class="back-btn ai-back-btn" type="button" title="Назад">←</button>
        <div class="ai-title-block">
          <div class="ai-title">ИИ ассистенты</div>
          <div class="ai-subtitle">Выберите режим работы Lexicon</div>
        </div>
      </div>

      <div class="ai-hub-card">
        <div class="ai-assistant-grid">
          ${assistants.map((item) => `
            <button class="ai-assistant-pill" type="button" data-ai-action="${item.action}">
              <span class="ai-assistant-title">${escapeHTML(item.title)}</span>
              <span class="ai-assistant-subtitle">${escapeHTML(item.subtitle)}</span>
            </button>
          `).join("")}
        </div>
      </div>
    </section>
  `;

  backHomeFromAiBtn = document.getElementById("backHomeFromAiBtn");
  on(backHomeFromAiBtn, "click", () => showPage("home"));

  aiPage.querySelectorAll("[data-ai-action]").forEach((btn) => {
    btn.onclick = () => {
      const action = btn.dataset.aiAction || "soon";

      if (action === "vetting") {
        renderVettingInspectorPage();
        return;
      }

      showAiNotice("Ассистент в разработке.");
    };
  });
}

function renderVettingInspectorPage() {
  if (!aiPage) return;

  document.body.classList.add("vetting-page-open");

  const crewGroups = ["Officers", "Engineers", "ETO", "Ratings", "Catering"];
  const modes = [
    { id: "cards", title: "Карточки" },
    { id: "prepare", title: "Подготовка" },
    { id: "search", title: "Вопрос" }
  ];

  ensureVettingSessionId();

  aiPage.innerHTML = `
    <section class="ai-shell vetting-shell">
      <div class="ai-topline vetting-topline">
        <button id="backAiHubBtn" class="back-btn ai-back-btn" type="button" title="Назад">←</button>
        <div class="ai-title-block">
          <div class="ai-title">Ветинг-Инспектор AI</div>
        </div>
      </div>

      <div class="vetting-main-card vetting-main-card-clean">
        <div class="vetting-chip-row vetting-role-row">
          ${crewGroups.map((item) => `
            <button class="vetting-chip ${item === vettingActiveRole ? "active" : ""}" type="button" data-vetting-chip="${escapeHTML(item)}">${escapeHTML(item)}</button>
          `).join("")}
        </div>

        <div class="vetting-mode-row">
          ${modes.map((item) => `
            <button class="vetting-mode-btn ${item.id === vettingActiveMode ? "active" : ""}" type="button" data-vetting-mode="${escapeHTML(item.id)}">${escapeHTML(item.title)}</button>
          `).join("")}
        </div>

        <div id="vettingWorkspace" class="vetting-workspace"></div>
      </div>
    </section>
  `;

  const backBtn = document.getElementById("backAiHubBtn");
  on(backBtn, "click", renderAiHubPage);

  aiPage.querySelectorAll("[data-vetting-chip]").forEach((btn) => {
    btn.onclick = () => {
      vettingActiveRole = btn.dataset.vettingChip || "ETO";
      vettingLastCardPayload = null;
      aiPage.querySelectorAll("[data-vetting-chip]").forEach((item) => item.classList.remove("active"));
      btn.classList.add("active");
      renderVettingWorkspace();
    };
  });

  aiPage.querySelectorAll("[data-vetting-mode]").forEach((btn) => {
    btn.onclick = () => {
      vettingActiveMode = btn.dataset.vettingMode || "cards";
      vettingLastCardPayload = null;
      aiPage.querySelectorAll("[data-vetting-mode]").forEach((item) => item.classList.remove("active"));
      btn.classList.add("active");
      renderVettingWorkspace();
    };
  });

  renderVettingWorkspace();
}

function renderVettingWorkspace() {
  const workspace = document.getElementById("vettingWorkspace");
  if (!workspace) return;

  if (vettingActiveMode === "prepare") {
    workspace.innerHTML = `
      <div class="vetting-work-card">
        <textarea id="vettingTopicInput" class="vetting-compact-input" rows="2" placeholder="Тема подготовки: emergency generator, fire detection, UPS..."></textarea>

        <div id="vettingOutputBox" class="vetting-question-box">
          <div class="vetting-empty-state">Введите тему и нажмите «Подготовить».</div>
        </div>

        <div class="vetting-action-row">
          <button class="vetting-action-btn primary" type="button" data-vetting-action="prepare">Подготовить</button>
          <button class="vetting-action-btn" type="button" data-vetting-action="clear">Очистить</button>
        </div>
      </div>
    `;
  } else if (vettingActiveMode === "search") {
    workspace.innerHTML = `
      <div class="vetting-work-card">
        <textarea id="vettingTextInput" class="vetting-compact-input" rows="2" placeholder="Задай вопрос по базе SIRE / VetAI"></textarea>

        <div id="vettingOutputBox" class="vetting-question-box">
          <div class="vetting-empty-state">Введите вопрос и нажмите «Спросить».</div>
        </div>

        <div class="vetting-action-row">
          <button class="vetting-action-btn primary" type="button" data-vetting-action="ask">Спросить</button>
          <button class="vetting-action-btn" type="button" data-vetting-action="clear">Очистить</button>
        </div>
      </div>
    `;
  } else {
    workspace.innerHTML = `
      <div class="vetting-work-card">
        <div id="vettingOutputBox" class="vetting-question-box">
          <div class="vetting-empty-state">Нажмите «Следующий вопрос».</div>
        </div>

        <div class="vetting-action-row">
          <button class="vetting-action-btn primary" type="button" data-vetting-action="next_question">Следующий вопрос</button>
          <button class="vetting-action-btn" type="button" data-vetting-action="show_answer">Показать ответ</button>
        </div>
      </div>
    `;
  }

  workspace.querySelectorAll("[data-vetting-action]").forEach((btn) => {
    btn.onclick = () => {
      const action = btn.dataset.vettingAction || "";
      if (action === "clear") {
        clearVettingOutput();
        return;
      }
      sendVettingAction(action);
    };
  });

  setVettingBusy(vettingBusy);
}

function ensureVettingSessionId() {
  if (vettingSessionId) return vettingSessionId;

  vettingSessionId = uid("vetai_session");
  localStorage.setItem("vetai_session_id", vettingSessionId);
  return vettingSessionId;
}

function getActiveVettingRole() {
  const active = aiPage?.querySelector("[data-vetting-chip].active");
  return active?.dataset?.vettingChip || vettingActiveRole || "ETO";
}

function getVettingTopicValue() {
  const topicInput = document.getElementById("vettingTopicInput");
  return String(topicInput?.value || "").trim();
}

function getVettingTextValue() {
  const textInput = document.getElementById("vettingTextInput");
  return String(textInput?.value || "").trim();
}

function getVettingOutputBox() {
  return document.getElementById("vettingOutputBox") || document.getElementById("vettingQuestionBox") || document.getElementById("vettingAnswerBox");
}

function normalizeVettingTextForDisplay(value) {
  return String(value || "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeVettingCardText(value) {
  return normalizeVettingTextForDisplay(value)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function getVettingResponseText(data) {
  if (!data) return "";

  if (data.card && typeof data.card === "object") {
    return JSON.stringify(data.card);
  }

  if (data.payload && typeof data.payload === "object") {
    return JSON.stringify(data.payload);
  }

  return String(data.answer || data.result || data.raw || "").trim();
}

function parseVettingJsonResponse(dataOrText) {
  if (!dataOrText) return null;

  const candidates = [];
  const addCandidate = (value) => {
    if (value === undefined || value === null) return;
    candidates.push(value);
  };

  if (typeof dataOrText === "object" && !Array.isArray(dataOrText)) {
    addCandidate(dataOrText.card);
    addCandidate(dataOrText.payload);
    addCandidate(dataOrText.result);
    addCandidate(dataOrText.answer);
    addCandidate(dataOrText.raw);
    addCandidate(dataOrText);
  } else {
    addCandidate(dataOrText);
  }

  for (const candidate of candidates) {
    const parsed = parseOneVettingJsonCandidate(candidate);
    const normalized = normalizeVettingCardPayload(parsed);
    if (normalized && isVettingCardPayload(normalized)) return normalized;
  }

  for (const candidate of candidates) {
    const loose = extractLooseVettingCardPayload(String(candidate || ""));
    const normalized = normalizeVettingCardPayload(loose);
    if (normalized && isVettingCardPayload(normalized)) return normalized;
  }

  return null;
}

function parseOneVettingJsonCandidate(candidate) {
  if (!candidate) return null;

  if (typeof candidate === "object" && !Array.isArray(candidate)) {
    return candidate;
  }

  const raw = String(candidate || "").trim();
  if (!raw) return null;

  const variants = [];
  const clean = stripJsonCodeFence(raw);
  variants.push(clean);

  const first = clean.indexOf("{");
  const last = clean.lastIndexOf("}");
  if (first >= 0 && last > first) {
    variants.push(clean.slice(first, last + 1));
  }

  for (const value of variants) {
    const fixed = value
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/,\s*([}\]])/g, "$1")
      .trim();

    if (!fixed || !fixed.startsWith("{")) continue;

    try {
      const parsed = JSON.parse(fixed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {}
  }

  return null;
}

function normalizeVettingCardPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;

  const source = payload.card && typeof payload.card === "object" && !Array.isArray(payload.card)
    ? payload.card
    : payload.payload && typeof payload.payload === "object" && !Array.isArray(payload.payload)
      ? payload.payload
      : payload;

  const out = { ...source };
  const pick = (...keys) => {
    for (const key of keys) {
      const value = source[key];
      if (value !== undefined && value !== null && String(value).trim()) return value;
    }
    return "";
  };

  out.type = normalizeVettingCardText(pick("type") || (pick("answer_en", "answer_ru", "answer", "answerEnglish", "answerRu") ? "card_answer" : "card_question"));
  out.role = normalizeVettingCardText(pick("role") || getActiveVettingRole() || "");
  out.topic = normalizeVettingCardText(pick("topic", "title", "subject") || "");

  out.question_en = normalizeVettingCardText(pick("question_en", "questionEn", "question_english", "questionEnglish", "question") || "");
  out.question_ru = normalizeVettingCardText(pick("question_ru", "questionRu", "question_russian", "questionRussian") || "");
  out.answer_en = normalizeVettingCardText(pick("answer_en", "answerEn", "answer_english", "answerEnglish", "answer") || "");
  out.answer_ru = normalizeVettingCardText(pick("answer_ru", "answerRu", "answer_russian", "answerRussian") || "");

  out.inspector_expects_en = normalizeVettingArray(source.inspector_expects_en || source.inspectorExpectsEn || source.inspector_expects || source.expects_en || source.expects || []);
  out.inspector_expects_ru = normalizeVettingArray(source.inspector_expects_ru || source.inspectorExpectsRu || source.expects_ru || []);
  out.evidence_en = normalizeVettingArray(source.evidence_en || source.evidenceEn || source.evidence || source.records_en || source.records || []);
  out.evidence_ru = normalizeVettingArray(source.evidence_ru || source.evidenceRu || source.records_ru || []);
  out.weak_answer_warning_en = normalizeVettingCardText(pick("weak_answer_warning_en", "weakAnswerWarningEn", "warning_en", "warning") || "");
  out.weak_answer_warning_ru = normalizeVettingCardText(pick("weak_answer_warning_ru", "weakAnswerWarningRu", "warning_ru") || "");

  return out;
}

function extractLooseVettingCardPayload(rawText) {
  const raw = String(rawText || "").trim();
  if (!raw || !raw.includes('"type"')) return null;

  const getString = (key) => {
    const re = new RegExp('"' + key + '"\\s*:\\s*"([\\s\\S]*?)"\\s*(?:,|\\n|})', "m");
    const match = raw.match(re);
    if (!match) return "";

    return match[1]
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .trim();
  };

  const getArray = (key) => {
    const re = new RegExp('"' + key + '"\\s*:\\s*\\[([\\s\\S]*?)\\]', "m");
    const match = raw.match(re);
    if (!match) return [];

    const items = [];
    const itemRe = /"([\s\S]*?)"\s*(?:,|$)/g;
    let itemMatch;
    while ((itemMatch = itemRe.exec(match[1])) !== null) {
      const item = itemMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
      if (item) items.push(item);
    }
    return items;
  };

  const payload = {
    type: getString("type"),
    role: getString("role"),
    topic: getString("topic"),
    question_en: getString("question_en"),
    question_ru: getString("question_ru"),
    answer_en: getString("answer_en"),
    answer_ru: getString("answer_ru"),
    inspector_expects_en: getArray("inspector_expects_en"),
    inspector_expects_ru: getArray("inspector_expects_ru"),
    evidence_en: getArray("evidence_en"),
    evidence_ru: getArray("evidence_ru"),
    weak_answer_warning_en: getString("weak_answer_warning_en"),
    weak_answer_warning_ru: getString("weak_answer_warning_ru")
  };

  return payload;
}

function normalizeVettingArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeVettingCardText(item)).filter(Boolean);
  }

  const text = normalizeVettingCardText(value);
  return text ? [text] : [];
}

function isVettingCardPayload(payload) {
  const type = String(payload?.type || "").trim();
  return type === "card_question" || type === "card_answer" || Boolean(payload?.question_en || payload?.question_ru || payload?.answer_en || payload?.answer_ru);
}

function getVettingCardType(payload) {
  const type = String(payload?.type || "").trim();
  if (type === "card_answer" || payload?.answer_en || payload?.answer_ru) return "card_answer";
  return "card_question";
}

function setVettingOutput(text, state = "ready") {
  const box = getVettingOutputBox();
  if (!box) return;

  box.classList.toggle("loading", state === "loading");
  box.classList.remove("structured");
  box.innerHTML = "";
  box.textContent = normalizeVettingTextForDisplay(text);
}

function clearVettingOutput() {
  const box = getVettingOutputBox();
  if (!box) return;

  box.classList.remove("loading", "structured");
  if (vettingActiveMode === "cards") vettingLastCardPayload = null;
  if (vettingActiveMode === "prepare") {
    box.innerHTML = `<div class="vetting-empty-state">Введите тему и нажмите «Подготовить».</div>`;
  } else if (vettingActiveMode === "search") {
    box.innerHTML = `<div class="vetting-empty-state">Введите вопрос и нажмите «Спросить».</div>`;
  } else {
    box.innerHTML = `<div class="vetting-empty-state">Нажмите «Следующий вопрос».</div>`;
  }
}

function setVettingAnswer(text, state = "ready") {
  setVettingOutput(text, state);
}

function setVettingQuestion(text, state = "ready") {
  setVettingOutput(text, state);
}

function renderVettingCardResponse(dataOrText, action = "") {
  const payload = parseVettingJsonResponse(dataOrText);

  if (!payload || !isVettingCardPayload(payload)) {
    const fallback = getVettingResponseText(dataOrText) || String(dataOrText || "Пустой ответ от VetAI.");
    const cleanFallback = String(fallback || "").trim();
    const looksLikeJson = cleanFallback.startsWith("{") || cleanFallback.includes('"type"');
    setVettingQuestion(looksLikeJson ? "Ответ пришёл в JSON, но App.js не смог его разобрать. Проверь PROMPT_VETAI_CARDS: JSON должен быть валидным и без лишнего текста." : cleanFallback, "ready");
    return;
  }

  const box = getVettingOutputBox();
  if (!box) return;

  const type = getVettingCardType(payload);
  if (type === "card_question") {
    vettingLastCardPayload = payload;
  }
  const html = buildVettingCardSwipeHtml(payload, type);

  box.classList.remove("loading");
  box.classList.add("structured");
  box.innerHTML = html;
  bindVettingCardSwipe(box);
  resetVettingCardScroll(box);
}

function resetVettingCardScroll(root) {
  const reset = () => {
    root.querySelectorAll(".vetting-card-panel").forEach((panel) => {
      panel.scrollTop = 0;
    });

    const frame = root.querySelector("#vettingLangFrame");
    if (frame) frame.scrollTop = 0;

    const box = getVettingOutputBox();
    if (box) box.scrollTop = 0;
  };

  reset();
  requestAnimationFrame(reset);
  setTimeout(reset, 60);
}

function buildVettingCardSwipeHtml(payload, type) {
  const isAnswer = type === "card_answer";
  const topic = String(payload.topic || "").trim();
  const role = String(payload.role || getActiveVettingRole() || "").trim();

  const enHtml = isAnswer
    ? buildVettingAnswerPanelHtml(payload, "en", topic, role)
    : buildVettingQuestionPanelHtml(payload, "en", topic, role);

  const ruHtml = isAnswer
    ? buildVettingAnswerPanelHtml(payload, "ru", topic, role)
    : buildVettingQuestionPanelHtml(payload, "ru", topic, role);

  const langClass = vettingCardLang === "ru" ? "lang-ru" : "lang-en";

  return `
    <div id="vettingCardShell" class="vetting-card-shell ${langClass}" data-vetting-card-shell="1">
      <div class="vetting-lang-tabs">
        <button class="vetting-lang-btn ${vettingCardLang === "ru" ? "" : "active"}" type="button" data-vetting-lang-btn="en">EN</button>
        <button class="vetting-lang-btn ${vettingCardLang === "ru" ? "active" : ""}" type="button" data-vetting-lang-btn="ru">RU</button>
      </div>

      <div class="vetting-lang-frame" id="vettingLangFrame">
        <div class="vetting-lang-track" id="vettingLangTrack">
          <section class="vetting-card-panel" data-vetting-panel="en">${enHtml}</section>
          <section class="vetting-card-panel" data-vetting-panel="ru">${ruHtml}</section>
        </div>
      </div>
    </div>
  `;
}

function buildVettingQuestionPanelHtml(payload, lang, topic, role) {
  const isRu = lang === "ru";
  const question = normalizeVettingCardText(isRu ? payload.question_ru : payload.question_en);
  const safeTopic = normalizeVettingCardText(topic);

  return `
    ${safeTopic ? `<div class="vetting-card-topic">${escapeHTML(safeTopic)}</div>` : ""}
    <div class="vetting-card-main-text">${escapeHTML(question || (isRu ? "Вопрос не пришёл в JSON." : "No question in JSON."))}</div>
  `;
}

function buildVettingAnswerPanelHtml(payload, lang, topic, role) {
  const isRu = lang === "ru";
  const answer = normalizeVettingCardText(isRu ? payload.answer_ru : payload.answer_en);
  const expects = normalizeVettingArray(isRu ? payload.inspector_expects_ru : payload.inspector_expects_en);
  const evidence = normalizeVettingArray(isRu ? payload.evidence_ru : payload.evidence_en);
  const warning = normalizeVettingCardText(isRu ? payload.weak_answer_warning_ru : payload.weak_answer_warning_en);
  const safeTopic = normalizeVettingCardText(topic);
  const missingText = isRu
    ? "Русская версия ответа не пришла. Проверь PROMPT_VETAI_CARDS: поле answer_ru должно быть обязательным."
    : "English answer is missing. Check PROMPT_VETAI_CARDS: answer_en must be mandatory.";

  return `
    ${safeTopic ? `<div class="vetting-card-topic">${escapeHTML(safeTopic)}</div>` : ""}
    ${answer
      ? `<div class="vetting-card-main-text vetting-card-answer-text">${escapeHTML(answer)}</div>`
      : `<div class="vetting-card-small-text vetting-card-missing">${escapeHTML(missingText)}</div>`
    }
    ${buildVettingCardListSection(isRu ? "Что ожидает инспектор" : "Inspector expects", expects)}
    ${buildVettingCardListSection(isRu ? "Подтверждения / записи" : "Evidence / records", evidence)}
    ${warning ? `<div class="vetting-card-warning">${escapeHTML(warning)}</div>` : ""}
  `;
}

function buildVettingCardListSection(title, items) {
  const values = normalizeVettingArray(items);
  if (!values.length) return "";

  return `
    <div class="vetting-card-section">
      <div class="vetting-card-section-title">${escapeHTML(title)}</div>
      <ul class="vetting-card-list">
        ${values.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function bindVettingCardSwipe(root) {
  const shell = root.querySelector("[data-vetting-card-shell]");
  const frame = root.querySelector("#vettingLangFrame");

  const setLang = (lang) => {
    vettingCardLang = lang === "ru" ? "ru" : "en";
    shell?.classList.toggle("lang-ru", vettingCardLang === "ru");
    shell?.classList.toggle("lang-en", vettingCardLang !== "ru");
    root.querySelectorAll("[data-vetting-lang-btn]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.vettingLangBtn === vettingCardLang);
    });
  };

  root.querySelectorAll("[data-vetting-lang-btn]").forEach((btn) => {
    btn.onclick = () => setLang(btn.dataset.vettingLangBtn || "en");
  });

  if (!frame || frame.dataset.vettingSwipeBound === "1") return;
  frame.dataset.vettingSwipeBound = "1";

  let startX = 0;
  let startY = 0;
  let started = false;

  frame.addEventListener("touchstart", (event) => {
    if (!event.touches || !event.touches.length) return;
    started = true;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  }, { passive: true });

  frame.addEventListener("touchend", (event) => {
    if (!started || !event.changedTouches || !event.changedTouches.length) return;
    started = false;

    const dx = event.changedTouches[0].clientX - startX;
    const dy = event.changedTouches[0].clientY - startY;

    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;

    if (dx < 0) setLang("ru");
    else setLang("en");
  }, { passive: true });
}

function clearVettingAnswer() {
  clearVettingOutput();
}

function setVettingBusy(isBusy) {
  vettingBusy = !!isBusy;
  aiPage?.querySelectorAll("[data-vetting-action]").forEach((btn) => {
    btn.disabled = vettingBusy;
  });
}

async function sendVettingAction(action = "") {
  if (vettingBusy) return;
  if (!ensureAccessToken()) return;

  const role = getActiveVettingRole();
  const mode = vettingActiveMode || "cards";
  const topic = getVettingTopicValue();
  const text = getVettingTextValue();
  const normalizedAction = String(action || "").trim();
  const isCardsMode = mode === "cards";
  const isNextQuestion = isCardsMode && (normalizedAction === "next_question" || normalizedAction === "question");
  const isShowAnswer = isCardsMode && (normalizedAction === "show_answer" || normalizedAction === "answer");
  const lastCardForRequest = isShowAnswer ? vettingLastCardPayload : null;

  if (isShowAnswer && !lastCardForRequest) {
    setVettingQuestion("Сначала нажмите «Следующий вопрос».", "ready");
    return;
  }

  if (isNextQuestion) {
    vettingLastCardPayload = null;
  }

  setVettingBusy(true);

  if (isCardsMode) {
    setVettingQuestion("Связь с VetAI Worker...", "loading");
  } else {
    setVettingAnswer("Связь с VetAI Worker...", "loading");
  }

  try {
    const response = await fetch(`${VETAI_API_BASE}/api/vetai-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        sessionId: ensureVettingSessionId(),
        mode,
        role,
        action: normalizedAction,
        topic,
        text,
        lastCard: isCardsMode ? lastCardForRequest : null
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      const err = data?.error || `HTTP ${response.status}`;
      throw new Error(err);
    }

    const answer = getVettingResponseText(data) || "Пустой ответ от VetAI.";

    if (mode === "cards") {
      renderVettingCardResponse(data, action);
    } else {
      setVettingAnswer(answer, "ready");
    }
  } catch (error) {
    const errorText = `Ошибка связи с VetAI Worker: ${error?.message || error}`;

    if (mode === "cards") {
      setVettingQuestion(errorText, "ready");
    } else {
      setVettingAnswer(errorText, "ready");
    }
  } finally {
    setVettingBusy(false);
  }
}

function showAiNotice(message) {
  const text = String(message || "Ассистент в разработке.").trim();

  const overlay = document.createElement("div");
  overlay.className = "ai-notice-overlay";

  overlay.innerHTML = `
    <div class="ai-notice-card">
      <div class="ai-notice-title">ИИ ассистент</div>
      <div class="ai-notice-text">${escapeHTML(text)}</div>
      <button class="ai-notice-btn" type="button">Понятно</button>
    </div>
  `;

  const close = () => overlay.remove();

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });

  const btn = overlay.querySelector(".ai-notice-btn");
  if (btn) btn.onclick = close;

  document.body.appendChild(overlay);
}

function showLexiconPage() {
  if (!lexiconPage) return;
  renderLexiconPage();
  showExistingPage(lexiconPage);
  if (!publicDictionaryMode) {
    bootstrapDictionaries();
  }
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
    meta: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function renderLexiconPage() {
  if (!lexiconPage) return;

  const totalWords = dictionaries.reduce((sum, dict) => sum + (dict.words || []).length, 0);

  const lexiconSubtitle = publicDictionaryMode
    ? `Публичный словарь · ${formatWordsCountRu(totalWords)}`
    : `${dictionaries.length} словарей • ${formatWordsCountRu(totalWords)}`;

  lexiconPage.innerHTML = `
    <section class="lexicon-shell ${publicDictionaryMode ? "public-lexicon-shell" : ""}">
      <div class="lexicon-topline">
        ${publicDictionaryMode ? `
          <div class="public-lexicon-header">
            <div class="public-lexicon-title-block">
              <div class="public-lexicon-title">Публичный словарь</div>
              <div class="public-lexicon-count">${formatWordsCountRu(totalWords)}</div>
            </div>
            <button id="publicLexiconInstallBtn" class="public-lexicon-add-btn" type="button" title="Добавить в Lexicon">+ Lexicon</button>
          </div>
        ` : `<button id="backHomeFromLexiconBtn" class="back-btn lexicon-back-icon-btn" type="button" title="Назад">←</button>`}

        ${publicDictionaryMode ? "" : `
          <div class="lexicon-title-block">
            <div class="lexicon-subtitle">${lexiconSubtitle}</div>
          </div>

          <div class="lexicon-actions">
            <button id="lexiconMenuBtn" class="lexicon-icon-btn" type="button" title="Меню">☰</button>
            <button id="addDictionaryBtn" class="lexicon-add-btn" type="button" title="Добавить словарь">+</button>
          </div>
        `}
      </div>

      <div id="dictionaryList" class="dictionary-list"></div>
    </section>
  `;

  backHomeFromLexiconBtn = document.getElementById("backHomeFromLexiconBtn");
  on(backHomeFromLexiconBtn, "click", () => showPage("home"));

  const addDictionaryBtn = document.getElementById("addDictionaryBtn");
  const lexiconMenuBtn = document.getElementById("lexiconMenuBtn");
  const publicLexiconInstallBtn = document.getElementById("publicLexiconInstallBtn");
  on(addDictionaryBtn, "click", addDictionary);
  on(lexiconMenuBtn, "click", () => alert("Меню пока заглушка. Потом здесь будут импорт, экспорт, настройки и режимы."));
  on(publicLexiconInstallBtn, "click", showPublicLexiconInstallNotice);

  renderDictionaryList("");
}

function formatWordsCountRu(count) {
  const value = Math.max(0, Number(count) || 0);
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) return `${value} слово`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${value} слова`;
  return `${value} слов`;
}

function showPublicLexiconInstallNotice() {
  alert("Для добавления словаря необходимо установить приложение Lexicon.");
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
    block.className = `dictionary-block ${isOpen ? "open" : ""} ${isOpen && hasExpandedDictionaryWord(dict.id) ? "word-card-open" : ""}`;
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
        ${publicDictionaryMode ? "" : `
          <div class="dictionary-panel-head">
            <div class="dictionary-add-row">
              <input class="dictionary-word-input" data-word-input="${dict.id}" type="text" placeholder="+ Введите слово..." />
              <button class="dictionary-add-word-btn" type="button" data-word-add="${dict.id}" title="Добавить">→</button>
            </div>

            <div class="dictionary-panel-actions">
              <div class="dictionary-panel-menu-wrap">
                <button class="dictionary-panel-menu-btn" type="button" data-dict-menu="${dict.id}" title="Меню словаря">⋯</button>
              </div>
            </div>
          </div>
        `}

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
    on(row, "click", () => openWordFromDictionary(row.dataset.dictionaryId, row.dataset.wordOpen));
  });

  list.querySelectorAll("[data-dict-word-panel-tab]").forEach((btn) => {
    on(btn, "click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      switchDictionaryWordPanel(btn.dataset.dictWordPanelTab || "center");
    });
  });

  list.querySelectorAll("[data-dict-word-part-index]").forEach((btn) => {
    on(btn, "click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      dictionaryWordPartIndex = Math.max(0, Number(btn.dataset.dictWordPartIndex || "0") || 0);
      dictionaryWordExamplesExpanded = false;
      renderDictionaryList(getDictionarySearchValue());
    });
  });

  list.querySelectorAll("[data-dict-word-more-examples]").forEach((btn) => {
    on(btn, "click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      dictionaryWordExamplesExpanded = !dictionaryWordExamplesExpanded;
      renderDictionaryList(getDictionarySearchValue());
    });
  });

  bindDictionaryWordInlineSwipe();

  list.querySelectorAll("[data-word-select]").forEach((badge) => {
    on(badge, "click", (event) => {
      event.stopPropagation();
      toggleDictionaryWordSelection(badge.dataset.dictionaryId, badge.dataset.wordSelect);
    });
  });

  list.querySelectorAll("[data-word-delete]").forEach((btn) => {
    on(btn, "click", (event) => {
      event.stopPropagation();
      deleteWord(btn.dataset.wordDelete, btn.dataset.dictionaryId);
    });
  });
}

function getDictionaryWordSelectionKey(dictionaryId, wordId) {
  return `${dictionaryId || ""}::${wordId || ""}`;
}

function isDictionaryWordSelected(dictionaryId, wordId) {
  return selectedDictionaryWordIds.has(getDictionaryWordSelectionKey(dictionaryId, wordId));
}

function toggleDictionaryWordSelection(dictionaryId, wordId) {
  if (!dictionaryId || !wordId) return;

  const key = getDictionaryWordSelectionKey(dictionaryId, wordId);

  if (selectedDictionaryWordIds.has(key)) {
    selectedDictionaryWordIds.delete(key);
  } else {
    selectedDictionaryWordIds.add(key);
  }

  renderDictionaryList(getDictionarySearchValue());
}

function hasExpandedDictionaryWord(dictionaryId) {
  return Boolean(expandedDictionaryWordKey && expandedDictionaryWordKey.startsWith(`${dictionaryId || ""}::`));
}

function getExpandedDictionaryWordKey(dictionaryId, wordId) {
  return getDictionaryWordSelectionKey(dictionaryId, wordId);
}

function isDictionaryWordExpanded(dictionaryId, wordId) {
  return expandedDictionaryWordKey === getExpandedDictionaryWordKey(dictionaryId, wordId);
}

function renderWordsHtml(dict) {
  const words = dict.words || [];
  const isEditMode = !publicDictionaryMode && dictionaryEditModeId === dict.id;

  if (!words.length) {
    return `<div class="empty-word-list">${publicDictionaryMode ? "В этом публичном словаре пока нет слов." : "Слов пока нет. Введите первое слово сверху."}</div>`;
  }

  return words.map((item, index) => {
    const isExpanded = isDictionaryWordExpanded(dict.id, item.id);
    const rowHtml = renderDictionaryWordRowHtml(dict, item, index, isEditMode, isExpanded);

    if (!isExpanded) return rowHtml;

    return `
      <div class="dictionary-word-expanded-shell" data-expanded-word-key="${escapeHTML(getExpandedDictionaryWordKey(dict.id, item.id))}">
        <div class="dictionary-word-expanded-sticky">
          ${rowHtml}
          ${buildDictionaryWordPanelTabsHtml()}
        </div>
        ${buildDictionaryWordInlineDetailHtml(dict, item)}
      </div>
    `;
  }).join("");
}

function renderDictionaryWordRowHtml(dict, item, index, isEditMode, isExpanded = false) {
  const word = String(item.word || "").trim();
  const transcription = String(item.transcription || "").trim();
  const translation = String(item.translation || "перевод позже").trim();
  const partOfSpeech = String(item.partOfSpeech || "").trim();
  const showTranscription = shouldShowDictionaryItemTranscription(word, transcription);
  const isSelected = isDictionaryWordSelected(dict.id, item.id);

  return `
    <div class="word-row dictionary-word-card ${isEditMode ? "editing" : ""} ${isSelected ? "selected" : ""} ${isExpanded ? "expanded" : ""}" data-dictionary-id="${escapeHTML(dict.id)}" data-word-open="${escapeHTML(item.id)}">
      ${publicDictionaryMode
        ? `<span class="word-number-badge" title="Номер">${index + 1}</span>`
        : `<span class="word-number-badge" data-word-select="${escapeHTML(item.id)}" data-dictionary-id="${escapeHTML(dict.id)}" title="Выбрать">${index + 1}</span>`}

      <div class="word-main dictionary-word-main">
        <div class="word-line dictionary-word-line">
          <span class="word-text dictionary-word-text">${escapeHTML(word)}</span>
          ${showTranscription ? `<span class="word-transcription dictionary-word-transcription">${escapeHTML(transcription)}</span>` : ""}
          ${partOfSpeech ? `<span class="word-pos dictionary-word-pos">${escapeHTML(partOfSpeech)}</span>` : ""}
        </div>
        <div class="word-translation dictionary-word-translation">${escapeHTML(translation || "перевод позже")}</div>
      </div>

      ${isEditMode ? `<button class="word-delete-btn dictionary-word-delete-btn" type="button" data-dictionary-id="${escapeHTML(dict.id)}" data-word-delete="${escapeHTML(item.id)}" title="Удалить">×</button>` : ""}
    </div>
  `;
}

function buildDictionaryWordPanelTabsHtml() {
  const tabs = [
    ["left", "Мнемо"],
    ["center", "Перевод"],
    ["right", "Разбор"]
  ];

  return `
    <div class="text-panel-tabs word-panel-tabs dictionary-word-panel-tabs">
      ${tabs.map(([name, label]) => `
        <button class="text-panel-tab word-panel-tab ${dictionaryWordActivePanel === name ? "active" : ""}" type="button" data-dict-word-panel-tab="${name}">${label}</button>
      `).join("")}
    </div>
  `;
}

function buildDictionaryWordInlineDetailHtml(dict, item) {
  const fullCard = getWordFullCardMeta(item);

  if (!fullCard) {
    return `
      <div class="dictionary-word-inline-detail">
        <div class="dictionary-word-inline-loading">${publicDictionaryMode ? "Полная карточка пока не сохранена владельцем." : "Готовлю полную карточку слова..."}</div>
      </div>
    `;
  }

  if (fullCard.status === "loading") {
    return `
      <div class="dictionary-word-inline-detail">
        <div class="dictionary-word-inline-loading">Карточка догружается. Можно пока продолжать работать со словарём.</div>
      </div>
    `;
  }

  if (fullCard.status === "error") {
    const errors = Array.isArray(fullCard.errors) ? fullCard.errors.map((err) => err.message).filter(Boolean).join("\n") : "";
    return `
      <div class="dictionary-word-inline-detail">
        <div class="dictionary-word-inline-error">Не удалось подготовить полную карточку.${errors ? `<br>${escapeHTML(errors)}` : ""}</div>
      </div>
    `;
  }

  const centerCard = normalizeIncomingStructuredWordCard(fullCard.center);
  const trackOffset = getDictionaryWordPanelOffset(dictionaryWordActivePanel);

  return `
    <div class="dictionary-word-inline-detail">
      <div class="dictionary-word-inline-swipe-frame" data-dict-word-swipe-frame="1">
        <div class="dictionary-word-inline-swipe-track" data-dict-word-swipe-track="1" style="transform: translateX(${trackOffset});">
          <section class="dictionary-word-inline-panel" data-dict-word-panel="left">
            ${buildDictionaryWordSidePanelHtml("left", fullCard, centerCard)}
          </section>
          <section class="dictionary-word-inline-panel" data-dict-word-panel="center">
            ${buildDictionaryWordCenterPanelHtml(centerCard, fullCard.center)}
          </section>
          <section class="dictionary-word-inline-panel" data-dict-word-panel="right">
            ${buildDictionaryWordSidePanelHtml("right", fullCard, centerCard)}
          </section>
        </div>
      </div>
    </div>
  `;
}

function getDictionaryWordPanelOffset(panelName) {
  const offsets = {
    left: "0%",
    center: "-33.333333%",
    right: "-66.666666%"
  };

  return offsets[panelName] || offsets.center;
}

function switchDictionaryWordPanel(panelName) {
  if (!["left", "center", "right"].includes(panelName)) return;

  dictionaryWordActivePanel = panelName;

  document.querySelectorAll("[data-dict-word-panel-tab]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.dictWordPanelTab === panelName);
  });

  document.querySelectorAll("[data-dict-word-swipe-track]").forEach((track) => {
    track.style.transform = `translateX(${getDictionaryWordPanelOffset(panelName)})`;
  });
}

function buildDictionaryWordCenterPanelHtml(centerCard, rawCenter) {
  const card = centerCard || normalizeIncomingStructuredWordCard(rawCenter);

  if (!card || !Array.isArray(card.parts) || !card.parts.length) {
    const raw = rawCenter && typeof rawCenter === "object" ? String(rawCenter.raw || rawCenter.result || "").trim() : String(rawCenter || "").trim();

    return `<div class="word-card-body">${raw ? `<div class="word-side-result">${escapeHTML(raw)}</div>` : `<div class="dictionary-word-inline-empty">Перевод пока не готов.</div>`}</div>`;
  }

  const parts = getWordCardParts(card);
  const safeIndex = Math.max(0, Math.min(Number(dictionaryWordPartIndex) || 0, Math.max(parts.length - 1, 0)));
  const activePart = parts[safeIndex] || parts[0] || {};
  const meanings = Array.isArray(activePart.meanings) ? activePart.meanings : [];
  const extraExamples = getWordPartExtraExamples(activePart);
  const visibleExamples = dictionaryWordExamplesExpanded ? extraExamples : extraExamples.slice(0, 2);
  const hiddenExamplesCount = Math.max(0, extraExamples.length - visibleExamples.length);

  const partTabsHtml = parts.length > 1
    ? `<div class="word-pos-tabs">
        ${parts.map((part, index) => `
          <button class="word-pos-tab ${index === safeIndex ? "active" : ""}" type="button" data-dict-word-part-index="${index}">
            ${escapeHTML(getWordPartEnglishLabel(part))}
          </button>
        `).join("")}
      </div>`
    : "";

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
          <button class="word-more-examples-btn" type="button" data-dict-word-more-examples="1">
            ${dictionaryWordExamplesExpanded ? "Скрыть примеры" : `Показать ещё примеры${hiddenExamplesCount ? ` (${hiddenExamplesCount})` : ""}`}
            <span>${dictionaryWordExamplesExpanded ? "⌃" : "⌄"}</span>
          </button>
        ` : ""}
      </div>`
    : "";

  return `
    <div class="word-card-body">
      ${partTabsHtml}
      ${meaningsHtml}
      ${examplesHtml}
    </div>
  `;
}

function buildDictionaryWordSidePanelHtml(side, fullCard, centerCard) {
  const payload = side === "left" ? fullCard.left : fullCard.right;

  if (!payload) {
    return buildWordSidePlaceholderHtml(side === "left" ? "Мнемоника пока не готова." : "Разбор пока не готов.");
  }

  if (payload.raw) {
    return buildWordSideResultHtml(payload.raw);
  }

  const normalized = side === "left" ? normalizeWordLeftPayload(payload) : normalizeWordRightPayload(payload);

  if (!normalized) {
    return buildWordSideResultHtml("Пустой ответ.");
  }

  return withTemporaryWordCardContext(centerCard, dictionaryWordPartIndex, () => {
    return side === "left" ? buildWordLeftDashboardHtml(normalized) : buildWordRightDashboardHtml(normalized);
  });
}

function withTemporaryWordCardContext(card, partIndex, callback) {
  const prevCard = currentWordTranslationCard;
  const prevPartIndex = currentWordPartIndex;

  currentWordTranslationCard = card || null;
  currentWordPartIndex = Math.max(0, Number(partIndex) || 0);

  try {
    return callback();
  } finally {
    currentWordTranslationCard = prevCard;
    currentWordPartIndex = prevPartIndex;
  }
}

function bindDictionaryWordInlineSwipe() {
  document.querySelectorAll("[data-dict-word-swipe-frame]").forEach((frame) => {
    if (frame.dataset.dictSwipeBound === "1") return;

    frame.dataset.dictSwipeBound = "1";

    let startX = 0;
    let startY = 0;
    let started = false;

    frame.addEventListener("touchstart", (event) => {
      if (!event.touches || !event.touches.length) return;
      started = true;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    }, { passive: true });

    frame.addEventListener("touchend", (event) => {
      if (!started || !event.changedTouches || !event.changedTouches.length) return;
      started = false;

      const dx = event.changedTouches[0].clientX - startX;
      const dy = event.changedTouches[0].clientY - startY;

      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;

      if (dx < 0) {
        if (dictionaryWordActivePanel === "left") switchDictionaryWordPanel("center");
        else if (dictionaryWordActivePanel === "center") switchDictionaryWordPanel("right");
      } else {
        if (dictionaryWordActivePanel === "right") switchDictionaryWordPanel("center");
        else if (dictionaryWordActivePanel === "center") switchDictionaryWordPanel("left");
      }
    }, { passive: true });
  });
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
  const willClose = expandedDictionaryId === dictionaryId;
  expandedDictionaryId = willClose ? null : dictionaryId;

  if (willClose || !hasExpandedDictionaryWord(dictionaryId)) {
    expandedDictionaryWordKey = null;
    dictionaryWordActivePanel = "center";
    dictionaryWordPartIndex = 0;
    dictionaryWordExamplesExpanded = false;
  }

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

  const existing = document.getElementById("dictionaryMenuPopover");

  if (existing && existing.dataset.dictionaryId === String(dictionaryId)) {
    existing.remove();
    return;
  }

  closeDictionaryMenu();

  const popover = document.createElement("div");
  popover.id = "dictionaryMenuPopover";
  popover.className = "dictionary-menu-popover";
  popover.dataset.dictionaryId = String(dictionaryId);
  const isEditMode = dictionaryEditModeId === dictionaryId;

  popover.innerHTML = `
    <button type="button" data-menu-action="edit">${isEditMode ? "Done" : "Edit"}</button>
    <button type="button" data-menu-action="rename">Rename</button>
    <button type="button" data-menu-action="public-link">Public link</button>
    <button type="button" class="danger" data-menu-action="delete">Delete</button>
  `;

  document.body.appendChild(popover);

  const rect = anchor.getBoundingClientRect();
  const popoverWidth = 138;
  const left = Math.max(10, Math.min(window.innerWidth - popoverWidth - 10, rect.right - popoverWidth));
  const top = Math.min(window.innerHeight - 124, rect.bottom + 7);

  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;

  const stopEvent = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }
  };

  const cleanupOutside = () => {
    document.removeEventListener("click", handleOutside, true);
  };

  const handleOutside = (event) => {
    if (popover.contains(event.target)) return;

    stopEvent(event);
    closeDictionaryMenu();
    cleanupOutside();
  };

  popover.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  requestAnimationFrame(() => {
    document.addEventListener("click", handleOutside, true);
  });

  popover.querySelector('[data-menu-action="edit"]')?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeDictionaryMenu();
    cleanupOutside();
    dictionaryEditModeId = dictionaryEditModeId === dictionaryId ? null : dictionaryId;
    renderDictionaryList(getDictionarySearchValue());
  });

  popover.querySelector('[data-menu-action="rename"]')?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeDictionaryMenu();
    cleanupOutside();
    renameDictionary(dictionaryId);
  });

  popover.querySelector('[data-menu-action="public-link"]')?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeDictionaryMenu();
    cleanupOutside();
    createAndCopyDictionaryPublicLink(dictionaryId);
  });

  popover.querySelector('[data-menu-action="delete"]')?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeDictionaryMenu();
    cleanupOutside();
    deleteDictionary(dictionaryId);
  });
}

async function createAndCopyDictionaryPublicLink(dictionaryId) {
  const dict = dictionaries.find((item) => item.id === dictionaryId);
  if (!dict) return;

  try {
    const data = await createDictionaryPublicLinkInCloud(dictionaryId);
    const publicLink = data.publicLink || {};
    const url = publicLink.url || publicLink.publicAppUrl || publicLink.publicApiUrl || "";

    if (!url) {
      throw new Error("Worker не вернул public link.");
    }

    showPublicLinkModal(url, dict.title || "Без названия");
  } catch (err) {
    alert("Не удалось создать public link:\n" + err.message);
  }
}

function showPublicLinkModal(url, dictionaryTitle = "") {
  closePublicLinkModal();

  const overlay = document.createElement("div");
  overlay.id = "publicLinkOverlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "10000";
  overlay.style.background = "rgba(10, 20, 15, 0.32)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "flex-end";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "16px";

  const sheet = document.createElement("div");
  sheet.style.width = "min(520px, 100%)";
  sheet.style.background = "#ffffff";
  sheet.style.border = "1px solid #d7e1da";
  sheet.style.borderRadius = "24px";
  sheet.style.boxShadow = "0 18px 50px rgba(20, 40, 30, 0.22)";
  sheet.style.padding = "16px";
  sheet.style.animation = "dictionaryPickerRise 0.18s ease-out";

  sheet.innerHTML = `
    <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:12px;">
      <div style="min-width:0;">
        <div style="font-size:20px; font-weight:800; color:#17211b;">Public link</div>
        <div style="font-size:14px; color:#6d7a72; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(dictionaryTitle || "словарь")}</div>
      </div>
      <button id="publicLinkCloseBtn" type="button" style="border:0; background:#f3f7f4; border-radius:999px; width:38px; height:38px; font-size:22px; line-height:1; color:#17211b;">×</button>
    </div>

    <div style="background:#f7fbf8; border:1px solid #d7e1da; border-radius:16px; padding:12px; color:#17211b; font-size:13px; line-height:1.35; word-break:break-all; user-select:text;">${escapeHTML(url)}</div>

    <button id="publicLinkCopyBtn" type="button" style="width:100%; margin-top:12px; border:0; background:#5f9962; color:#ffffff; border-radius:16px; padding:14px 16px; font-weight:800; text-align:center;">
      Скопировать ссылку
    </button>

    <button id="publicLinkOpenBtn" type="button" style="width:100%; margin-top:10px; border:0; background:#f3f7f4; color:#2f6f4b; border-radius:16px; padding:13px 16px; font-weight:750;">
      Открыть
    </button>
  `;

  overlay.appendChild(sheet);
  document.body.appendChild(overlay);

  const close = () => closePublicLinkModal();

  sheet.querySelector("#publicLinkCloseBtn")?.addEventListener("click", close);
  sheet.querySelector("#publicLinkOpenBtn")?.addEventListener("click", () => {
    window.open(url, "_blank", "noopener,noreferrer");
  });
  sheet.querySelector("#publicLinkCopyBtn")?.addEventListener("click", async () => {
    const copied = await writeTextToClipboard(url);
    const btn = sheet.querySelector("#publicLinkCopyBtn");

    if (btn) {
      btn.textContent = copied ? "Ссылка скопирована" : "Не удалось скопировать";
      setTimeout(() => {
        if (btn && document.body.contains(btn)) btn.textContent = "Скопировать ссылку";
      }, 1200);
    }

    if (!copied) {
      prompt("Скопируй public link:", url);
    }
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
}

function closePublicLinkModal() {
  const existing = document.getElementById("publicLinkOverlay");
  if (existing) existing.remove();
}

async function bootstrapPublicDictionaryFromUrl() {
  const shareId = getPublicDictionaryShareIdFromUrl();

  if (!shareId) return;

  publicDictionaryMode = true;
  publicDictionaryShareId = shareId;
  dictionaries = [];
  expandedDictionaryId = null;
  dictionaryEditModeId = null;
  expandedDictionaryWordKey = null;

  hidePage(homePage);
  hidePage(filesPage);
  hidePage(aiPage);

  if (lexiconPage) {
    lexiconPage.innerHTML = `
      <section class="lexicon-shell public-lexicon-shell">
        <div class="lexicon-topline">
          <div class="lexicon-title-block">
            <div class="lexicon-subtitle">Загрузка публичного словаря...</div>
          </div>
        </div>
        <div class="lexicon-empty">Пожалуйста, подождите.</div>
      </section>
    `;
    showExistingPage(lexiconPage);
  }

  try {
    const data = await loadPublicDictionaryFromCloud(shareId);
    const dictionary = normalizeDictionaryFromApi(data.dictionary || data.publicDictionary || {});
    dictionaries = dictionary.id ? [dictionary] : [];
    expandedDictionaryId = dictionary.id || null;
    renderLexiconPage();
    showExistingPage(lexiconPage);
  } catch (err) {
    if (lexiconPage) {
      lexiconPage.innerHTML = `
        <section class="lexicon-shell public-lexicon-shell">
          <div class="lexicon-topline">
            <div class="lexicon-title-block">
              <div class="lexicon-subtitle">Public link недоступен</div>
            </div>
          </div>
          <div class="lexicon-empty">${escapeHTML(err.message || "Не удалось открыть публичный словарь.")}</div>
        </section>
      `;
      showExistingPage(lexiconPage);
    }
  }
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

  Array.from(selectedDictionaryWordIds).forEach((key) => {
    if (key.startsWith(`${dictionaryId}::`)) selectedDictionaryWordIds.delete(key);
  });

  if (expandedDictionaryId === dictionaryId) expandedDictionaryId = null;
  if (dictionaryEditModeId === dictionaryId) dictionaryEditModeId = null;
  if (hasExpandedDictionaryWord(dictionaryId)) expandedDictionaryWordKey = null;

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
  selectedDictionaryWordIds.delete(getDictionaryWordSelectionKey(dictionaryId, wordId));
  if (expandedDictionaryWordKey === getExpandedDictionaryWordKey(dictionaryId, wordId)) expandedDictionaryWordKey = null;
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

function openWordFromDictionary(dictionaryId, wordId) {
  if (!dictionaryId || !wordId) return;

  const dict = dictionaries.find((item) => item.id === dictionaryId);
  const wordItem = dict?.words?.find((item) => item.id === wordId);

  if (!dict || !wordItem) return;

  const key = getExpandedDictionaryWordKey(dictionaryId, wordId);

  if (expandedDictionaryWordKey === key) {
    expandedDictionaryWordKey = null;
    dictionaryWordActivePanel = "center";
    dictionaryWordPartIndex = 0;
    dictionaryWordExamplesExpanded = false;
    renderDictionaryList(getDictionarySearchValue());
    return;
  }

  expandedDictionaryId = dictionaryId;
  expandedDictionaryWordKey = key;
  dictionaryWordActivePanel = "center";
  dictionaryWordPartIndex = 0;
  dictionaryWordExamplesExpanded = false;
  renderDictionaryList(getDictionarySearchValue());

  if (publicDictionaryMode) return;

  if (!isWordFullCardReady(wordItem) && !isWordFullCardLoading(wordItem)) {
    enrichDictionaryWordFullCard(dictionaryId, wordId)
      .catch((err) => {
        console.warn("Dictionary inline word enrichment failed:", wordItem.word, err);
      })
      .finally(() => {
        if (expandedDictionaryWordKey === key) {
          renderDictionaryList(getDictionarySearchValue());
        }
      });
  }
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
function getPublicDictionaryShareIdFromUrl() {
  const params = new URLSearchParams(window.location.search || "");
  return (params.get("publicDictionary") || params.get("public_dictionary") || "").trim();
}

function initAccessToken() {
  if (getPublicDictionaryShareIdFromUrl()) return;

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
      if (!publicDictionaryMode) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        lockApp();
      }
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
