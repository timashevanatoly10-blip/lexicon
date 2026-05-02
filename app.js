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

uploadBtn.addEventListener("click", uploadFile);
checkBtn.addEventListener("click", checkStatus);
downloadBtn.addEventListener("click", downloadResult);
manualCheckBtn.addEventListener("click", checkManual);

initAccessToken();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

async function uploadFile() {
  const file = fileInput.files[0];

  if (!ensureAccessToken()) {
    return;
  }

  if (!file) {
    showStatus("Выбери файл.");
    return;
  }

  setBusy(true);
  showStatus("Отправляю файл в DeepL...");
  downloadBtn.classList.add("hidden");

  try {
    const formData = new FormData();
    formData.append("file", file, file.name);
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

  currentDocumentId = manualId.value.trim();
  currentDocumentKey = manualKey.value.trim();

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
      downloadBtn.classList.remove("hidden");
    } else {
      downloadBtn.classList.add("hidden");
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
  const token = window.prompt("Введи API token для доступа к приложению:");

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
        <div class="subtitle">PDF Translator</div>
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
  statusCard.classList.remove("hidden");
  statusText.textContent = text;
}

function setBusy(isBusy) {
  uploadBtn.disabled = isBusy;
  checkBtn.disabled = isBusy;
  manualCheckBtn.disabled = isBusy;
  downloadBtn.disabled = isBusy;
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
