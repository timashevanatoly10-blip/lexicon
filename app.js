const API_BASE = "https://lexicon-worker.timashevanatoly10.workers.dev";
const TOKEN_STORAGE_KEY = "lexicon_access_token";

let currentDocumentId = "";
let currentDocumentKey = "";

// ===== PAGES =====
const homePage = document.getElementById("homePage");
const filesPage = document.getElementById("filesPage");
const aiPage = document.getElementById("aiPage");
const lexiconPage = document.getElementById("lexiconPage");

// ===== NAV =====
const openFilesBtn = document.getElementById("openFilesBtn");
const openAiBtn = document.getElementById("openAiBtn");
const brandBtn = document.getElementById("brandBtn");

const backHomeFromFilesBtn = document.getElementById("backHomeFromFilesBtn");
const backHomeFromAiBtn = document.getElementById("backHomeFromAiBtn");
const backHomeFromLexiconBtn = document.getElementById("backHomeFromLexiconBtn");

// ===== FILES UI (оставляем как было) =====
const fileInput = document.getElementById("fileInput");
const targetLang = document.getElementById("targetLang");
const uploadBtn = document.getElementById("uploadBtn");
const statusCard = document.getElementById("statusCard");
const statusText = document.getElementById("statusText");
const checkBtn = document.getElementById("checkBtn");
const downloadBtn = document.getElementById("downloadBtn");
const manualId = document.getElementById("manualId");
const manualKey = document.getElementById("manualKey");
const manualCheckBtn = document.getElementById("manualCheckBtn");

// ===== HOME UI =====
const wordModeBtn = document.getElementById("wordModeBtn");
const textModeBtn = document.getElementById("textModeBtn");
const wordInputBox = document.getElementById("wordInputBox");
const textInputBox = document.getElementById("textInputBox");
const homeResult = document.getElementById("homeResult");

// ===== EVENTS =====
uploadBtn.addEventListener("click", uploadFile);
checkBtn.addEventListener("click", checkStatus);
downloadBtn.addEventListener("click", downloadResult);
manualCheckBtn.addEventListener("click", checkManual);

// navigation
openFilesBtn.addEventListener("click", () => showPage("files"));
openAiBtn.addEventListener("click", () => showPage("ai"));
brandBtn.addEventListener("click", () => showPage("lexicon"));

backHomeFromFilesBtn.addEventListener("click", () => showPage("home"));
backHomeFromAiBtn.addEventListener("click", () => showPage("home"));
backHomeFromLexiconBtn.addEventListener("click", () => showPage("home"));

// mode switch
wordModeBtn.addEventListener("click", () => setMode("word"));
textModeBtn.addEventListener("click", () => setMode("text"));

initAccessToken();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

// ===== NAVIGATION =====
function showPage(page) {
  homePage.classList.add("hidden");
  filesPage.classList.add("hidden");
  aiPage.classList.add("hidden");
  lexiconPage.classList.add("hidden");

  if (page === "home") homePage.classList.remove("hidden");
  if (page === "files") filesPage.classList.remove("hidden");
  if (page === "ai") aiPage.classList.remove("hidden");
  if (page === "lexicon") lexiconPage.classList.remove("hidden");
}

// ===== MODE SWITCH =====
function setMode(mode) {
  if (mode === "word") {
    wordModeBtn.classList.add("active");
    textModeBtn.classList.remove("active");
    wordInputBox.classList.remove("hidden");
    textInputBox.classList.add("hidden");
  } else {
    wordModeBtn.classList.remove("active");
    textModeBtn.classList.add("active");
    wordInputBox.classList.add("hidden");
    textInputBox.classList.remove("hidden");
  }
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

  document.getElementById("retryTokenBtn").onclick = () => {
    requestAccessToken();
    if (getAccessToken()) location.reload();
  };
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

// ===== FILE LOGIC (НЕ ТРОГАЛ) =====
async function uploadFile() {
  const file = fileInput.files[0];

  if (!ensureAccessToken()) return;

  if (!file) {
    showStatus("Выбери файл.");
    return;
  }

  setBusy(true);
  showStatus("Отправляю файл...");

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("target_lang", targetLang.value);

    const res = await fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      headers: authHeaders(),
      body: formData
    });

    const data = await readJsonOrThrow(res);

    currentDocumentId = data.document_id;
    currentDocumentKey = data.document_key;

    manualId.value = currentDocumentId;
    manualKey.value = currentDocumentKey;

    showStatus("Файл отправлен");
  } catch (err) {
    showStatus(err.message);
  } finally {
    setBusy(false);
  }
}

async function checkManual() {
  currentDocumentId = manualId.value.trim();
  currentDocumentKey = manualKey.value.trim();
  await checkStatus();
}

async function checkStatus() {
  if (!ensureAccessToken()) return;

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

    if (data.status === "done") {
      downloadBtn.classList.remove("hidden");
    }
  } finally {
    setBusy(false);
  }
}

async function downloadResult() {
  if (!ensureAccessToken()) return;

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

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "translated.pdf";
  a.click();

  URL.revokeObjectURL(url);
}

// ===== HELPERS =====
function showStatus(text) {
  statusCard.classList.remove("hidden");
  statusText.textContent = text;
}

function setBusy(v) {
  uploadBtn.disabled = v;
  checkBtn.disabled = v;
  manualCheckBtn.disabled = v;
  downloadBtn.disabled = v;
}

async function readJsonOrThrow(res) {
  const text = await res.text();

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      lockApp();
      throw new Error("Unauthorized");
    }
    throw new Error(text);
  }

  return JSON.parse(text);
}
