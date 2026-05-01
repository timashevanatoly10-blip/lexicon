const API_BASE = "https://lexicon-worker.timashevanatoly10.workers.dev";

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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

async function uploadFile() {
  const file = fileInput.files[0];

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
  currentDocumentId = manualId.value.trim();
  currentDocumentKey = manualKey.value.trim();

  if (!currentDocumentId || !currentDocumentKey) {
    showStatus("Вставь document_id и document_key.");
    return;
  }

  await checkStatus();
}

async function checkStatus() {
  if (!currentDocumentId || !currentDocumentKey) {
    showStatus("Нет document_id/document_key.");
    return;
  }

  setBusy(true);
  showStatus("Проверяю статус...");

  try {
    const res = await fetch(`${API_BASE}/api/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  if (!currentDocumentId || !currentDocumentKey) {
    showStatus("Нет document_id/document_key.");
    return;
  }

  setBusy(true);
  showStatus("Скачиваю переведённый файл...");

  try {
    const res = await fetch(`${API_BASE}/api/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    throw new Error(text || `HTTP ${res.status}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Ответ не JSON:\n" + text);
  }
}
