const API_BASE = "https://lexicon-worker.timashevanatoly10.workers.dev";
const TOKEN_STORAGE_KEY = "lexicon_access_token";

let currentDocumentId = "";
let currentDocumentKey = "";

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

const homePage = document.getElementById("homePage");
const filesPage = document.getElementById("filesPage");
const aiPage = document.getElementById("aiPage");
const lexiconPage = document.getElementById("lexiconPage");

const brandBtn = document.getElementById("brandBtn");
const openFilesBtn = document.getElementById("openFilesBtn");
const openAiBtn = document.getElementById("openAiBtn");

const backHomeFromFilesBtn = document.getElementById("backHomeFromFilesBtn");
const backHomeFromAiBtn = document.getElementById("backHomeFromAiBtn");
const backHomeFromLexiconBtn = document.getElementById("backHomeFromLexiconBtn");

const wordModeBtn = document.getElementById("wordModeBtn");
const textModeBtn = document.getElementById("textModeBtn");
const wordInputBox = document.getElementById("wordInputBox");
const textInputBox = document.getElementById("textInputBox");
const wordTranslateBtn = document.getElementById("wordTranslateBtn");
const textTranslateBtn = document.getElementById("textTranslateBtn");
const homeResult = document.getElementById("homeResult");

safeOn(uploadBtn, "click", uploadFile);
safeOn(checkBtn, "click", checkStatus);
safeOn(downloadBtn, "click", downloadResult);
safeOn(manualCheckBtn, "click", checkManual);

safeOn(brandBtn, "click", () => showPage("lexicon"));
safeOn(openFilesBtn, "click", () => showPage("files"));
safeOn(openAiBtn, "click", () => showPage("ai"));

safeOn(backHomeFromFilesBtn, "click", () => showPage("home"));
safeOn(backHomeFromAiBtn, "click", () => showPage("home"));
safeOn(backHomeFromLexiconBtn, "click", () => showPage("home"));

safeOn(wordModeBtn, "click", () => setMode("word"));
safeOn(textModeBtn, "click", () => setMode("text"));

safeOn(wordTranslateBtn, "click", () => showHomeStub("word"));
safeOn(textTranslateBtn, "click", () => showHomeStub("text"));

initAccessToken();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

function safeOn(element, eventName, handler) {
  if (element) {
    element.addEventListener(eventName, handler);
  }
}

function showPage(pageName) {
  const pages = [homePage, filesPage, aiPage, lexiconPage].filter(Boolean);

  pages.forEach((page) => {
    page.classList.add("hidden");
    page.classList.remove("active");
  });

  if (pageName === "home") {
    showExistingPage(homePage);
    return;
  }

  if (pageName === "files") {
    if (filesPage && filesPage.children.length > 0) {
      showExistingPage(filesPage);
    } else {
      showHomeMessage("Раздел «Файлы» не найден в текущем HTML. Нужно вернуть файловую страницу в index.html.");
      showExistingPage(homePage);
    }
    return;
  }

  if (pageName === "ai") {
    if (aiPage && aiPage.children.length > 0) {
      showExistingPage(aiPage);
    } else {
      showHomeMessage("ИИ-режим пока заглушка. Позже здесь будет отдельный экран для работы с ИИ.");
      showExistingPage(homePage);
    }
    return;
  }

  if (pageName === "lexicon") {
    if (lexiconPage && lexiconPage.children.length > 0) {
      showExistingPage(lexiconPage);
    } else {
      showHomeMessage("Лексикон / словари пока заглушка. Позже здесь будут личные словари.");
      showExistingPage(homePage);
    }
    return;
  }

  showExistingPage(homePage);
}

function showExistingPage(page) {
  if (!page) return;

  page.classList.remove("hidden");
  page.classList.add("active");
}

function setMode(mode) {
  if (mode === "word") {
    wordModeBtn?.classList.add("active");
    textModeBtn?.classList.remove("active");
    wordInputBox?.classList.remove("hidden");
    textInputBox?.classList.add("hidden");
    return;
  }

  wordModeBtn?.classList.remove("active");
  textModeBtn?.classList.add("active");
  wordInputBox?.classList.add("hidden");
  textInputBox?.classList.remove("hidden");
}

function showHomeStub(mode) {
  const text = mode === "word"
    ? "Пока это UI-заглушка для словарного перевода. Следующим шагом подключим GPT-разбор слова/слов."
    : "Пока это UI-заглушка для перевода текста. Следующим шагом подключим GPT-перевод текста.";

  showHomeMessage(text);
}

function showHomeMessage(text) {
  if (homeResult) {
    homeResult.textContent = text;
  }
}

async function uploadFile() {
  const file = fileInput?.files?.[0];

  if (!ensureAccessToken()) {
    return;
  }

  if (!file) {
    showStatus("Выбери файл.");
    return;
  }

  setBusy(true);
  showStatus("Отправляю файл в DeepL...");
  downloadBtn?.classList.add("hidden");

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
      "document_key:\n" + currentDocumentKey + "\n\n" +
      "Теперь проверь статус."
    );
  } catch (err) {
    showStatus("Ошибка загрузки:\n" + err.message);
  } finally {
    setBusy(false);
  }
}

async function checkManual() {
  if (!ensureAccessToken()) {
    return;
  }

  currentDocumentId = manualId?.value?.trim() || "";
  currentDocumentKey = manualKey?.value?.trim() || "";

  if (!currentDocumentId || !currentDocumentKey) {
    showStatus("Вставь document_id и document_key.");
    return;
  }

  await checkStatus();
}

async function checkStatus() {
  if (!ensureAccessToken()) {
    return;
  }

  if (!currentDocumentId || !currentDocumentKey) {
    showStatus("Нет document_id/document_key.");
    return;
  }

  setBusy(true);
  showStatus("Проверяю статус...");

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
      downloadBtn?.classList.remove("hidden");
    } else {
      downloadBtn?.classList.add("hidden");
    }
  } catch (err) {
    showStatus("Ошибка статуса:\n" + err.message);
  } finally {
    setBusy(false);
  }
}

async function downloadResult() {
  if (!ensureAccessToken()) {
    return;
  }

  if (!currentDocumentId || !currentDocumentKey) {
    showStatus("Нет document_id/document_key.");
    return;
  }

  setBusy(true);
  showStatus("Скачиваю переведённый файл...");

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

    if (!res.ok) {
      throw new Error(await res.text());
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "translated-document.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
    showStatus("Файл скачан.");
  } catch (err) {
    showStatus("Ошибка скачивания:\n" + err.message);
  } finally {
    setBusy(false);
  }
}

function initAccessToken() {
  const savedToken = getAccessToken();

  if (savedToken) {
    return;
  }

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
      <header class="topbar">
        <button class="brand" type="button">LEXICON</button>
      </header>

      <section class="card">
        <h1>Доступ закрыт</h1>
        <p class="hint">Для работы приложения нужен токен доступа.</p>
        <button id="retryTokenBtn" class="primary" type="button">Ввести токен</button>
      </section>
    </main>
  `;

  const retryTokenBtn = document.getElementById("retryTokenBtn");
  if (retryTokenBtn) {
    retryTokenBtn.addEventListener("click", () => {
      requestAccessToken();
      if (getAccessToken()) {
        window.location.reload();
      }
    });
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

function showStatus(text) {
  if (!statusCard || !statusText) {
    showHomeMessage(text);
    return;
  }

  statusCard.classList.remove("hidden");
  statusText.textContent = text;
}

function setBusy(isBusy) {
  if (uploadBtn) uploadBtn.disabled = isBusy;
  if (checkBtn) checkBtn.disabled = isBusy;
  if (manualCheckBtn) manualCheckBtn.disabled = isBusy;
  if (downloadBtn) downloadBtn.disabled = isBusy;
}

async function readJsonOrThrow(res) {
  const text = await res.text();

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      lockApp();
      throw new Error("Неверный токен или доступ запрещён.");
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
