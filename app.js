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

const tokenPanel = createTokenPanel();
const tokenInput = tokenPanel.querySelector("#accessTokenInput");
const saveTokenBtn = tokenPanel.querySelector("#saveTokenBtn");
const clearTokenBtn = tokenPanel.querySelector("#clearTokenBtn");
const tokenStatus = tokenPanel.querySelector("#tokenStatus");

uploadBtn.addEventListener("click", uploadFile);
checkBtn.addEventListener("click", checkStatus);
downloadBtn.addEventListener("click", downloadResult);
manualCheckBtn.addEventListener("click", checkManual);
saveTokenBtn.addEventListener("click", saveAccessToken);
clearTokenBtn.addEventListener("click", clearAccessToken);

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

function createTokenPanel() {
  const panel = document.createElement("section");
  panel.className = "card";
  panel.innerHTML = `
    <h2>Доступ</h2>
    <p class="hint">Введите токен доступа. Он сохранится только в этом браузере.</p>

    <label class="field">
      <span>Токен</span>
      <input id="accessTokenInput" type="password" autocomplete="off" placeholder="Введите токен">
    </label>

    <div class="actions">
      <button id="saveTokenBtn" type="button">Сохранить токен</button>
      <button id="clearTokenBtn" type="button">Сбросить</button>
    </div>

    <div id="tokenStatus" class="hint" style="margin-top: 12px;"></div>
  `;

  const firstCard = document.querySelector(".card");
  if (firstCard && firstCard.parentNode) {
    firstCard.parentNode.insertBefore(panel, firstCard);
  } else {
    document.body.prepend(panel);
  }

  return panel;
}

function initAccessToken() {
  const token = getAccessToken();

  if (token) {
    tokenInput.value = token;
    tokenStatus.textContent = "Токен сохранён.";
  } else {
    tokenStatus.textContent = "Токен не введён.";
  }
}

function saveAccessToken() {
  const token = tokenInput.value.trim();

  if (!token) {
    tokenStatus.textContent = "Введите токен.";
    return;
  }

  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  tokenStatus.textContent = "Токен сохранён.";
}

function clearAccessToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  tokenInput.value = "";
  tokenStatus.textContent = "Токен сброшен.";
}

function getAccessToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || "";
}

function ensureAccessToken() {
  const tokenFromInput = tokenInput.value.trim();
  const savedToken = getAccessToken();
  const token = tokenFromInput || savedToken;

  if (!token) {
    showStatus("Введите токен доступа и нажмите «Сохранить токен».");
    tokenInput.focus();
    return false;
  }

  if (tokenFromInput && tokenFromInput !== savedToken) {
    localStorage.setItem(TOKEN_STORAGE_KEY, tokenFromInput);
    tokenStatus.textContent = "Токен сохранён.";
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
  saveTokenBtn.disabled = isBusy;
  clearTokenBtn.disabled = isBusy;
}

async function readJsonOrThrow(res) {
  const text = await res.text();

  if (!res.ok) {
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
