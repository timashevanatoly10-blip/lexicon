const ALLOWED_ORIGINS = [
  "https://mylexicon.pages.dev",
  "https://timashevanatoly10-blip.github.io",
  "https://pwa-ui-5jh.pages.dev",
  "http://localhost:5173",
  "http://localhost:3000"
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const KV = env.CHAT_MEMORY; // KV namespace
    const DB = env.DB; // D1 binding
    const origin = request.headers.get("Origin") || "";

    // =========================================
    // 0) CORS preflight for browser API calls
    // =========================================
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    // =========================================
    // 0.1) VetAI browser chat endpoint
    // =========================================
    if (request.method === "POST" && url.pathname === "/api/vetai-chat") {
      const auth = await requireAuthContext(request, env, origin);
      if (auth.response) return auth.response;

      return await handleVetAiChat(request, env, KV, DB, origin, auth);
    }

    // =========================================
    // 1) Healthcheck
    // =========================================
    if (request.method === "GET" && url.pathname === "/") {
      return json({
        ok: true,
        service: "gptim24-memory-vision-stt",
        endpoints: {
          vetaiChat: "/api/vetai-chat",
          webhook: "/telegram/webhook",
          setWebhook: "/telegram/setWebhook",
        },
        bindings: {
          kv: !!KV,
          d1: !!DB,
        },
        runtime: {
          openai_model: (env.OPENAI_MODEL || "gpt-5.2").toString(),
          reasoning_effort: normalizeReasoningEffort(env.OPENAI_REASONING_EFFORT),
          max_output_tokens: normalizeMaxOutputTokens(env.OPENAI_MAX_OUTPUT_TOKENS),
          memory_window_size: normalizeWindowSize(env.MEMORY_WINDOW_SIZE, 16),
          vision_detail: getVisionDetail(env),
          stt_model: getSttModel(env),
          sire_vector_store_id: (env.SIRE_VECTOR_STORE_ID || "").toString() ? "configured" : "missing",
          prompt_vetai_cards: (env.PROMPT_VETAI_CARDS || "").toString() ? "configured" : "missing",
          prompt_vetai_prepare: (env.PROMPT_VETAI_PREPARE || "").toString() ? "configured" : "missing",
          prompt_vetai_search: (env.PROMPT_VETAI_SEARCH || "").toString() ? "configured" : "missing",
        },
      });
    }

    // =========================================
    // 2) Set Telegram Webhook
    // =========================================
    if (request.method === "GET" && url.pathname === "/telegram/setWebhook") {
      return await setTelegramWebhook(env, url.origin);
    }

    // =========================================
    // 3) Telegram webhook endpoint
    // =========================================
    if (url.pathname === "/telegram/webhook") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      // Secret header check (optional)
      const headerSecret =
        request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
      const expectedSecret = (env.TG_SECRET_TOKEN || "").trim();
      if (expectedSecret && headerSecret !== expectedSecret) {
        console.log("Bad telegram secret token header.");
        return new Response("Forbidden", { status: 403 });
      }

      let update;
      try {
        update = await request.json();
      } catch (e) {
        console.log("Bad JSON from Telegram:", e);
        return new Response("Bad Request", { status: 400 });
      }

      ctx.waitUntil(handleTelegramUpdate(env, KV, DB, update));
      return new Response("OK", { status: 200 });
    }

    return new Response("Not Found", { status: 404 });
  },
};

// ======================================================
// Utils
// ======================================================
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function corsJson(obj, origin, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function corsHeaders(origin) {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

async function requireAuthContext(request, env, origin) {
  const rawTokens = env.ACCESS_TOKENS || "";
  const allowedTokens = rawTokens
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  if (!allowedTokens.length) {
    return {
      response: corsJson({
        ok: false,
        error: "ACCESS_TOKENS is not configured",
      }, origin, 500),
    };
  }

  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";

  if (!token || !allowedTokens.includes(token)) {
    return {
      response: corsJson({
        ok: false,
        error: "Unauthorized",
      }, origin, 401),
    };
  }

  return {
    response: null,
    token,
    ownerTokenHash: await sha256Hex(token),
  };
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function sanitizeSessionId(value) {
  const raw = String(value || "default").trim();
  const safe = raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return safe || "default";
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function normalizeVetAiMode(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "cards" || raw === "card") return "cards";
  if (raw === "prepare" || raw === "preparation" || raw === "prep") return "prepare";
  if (raw === "search" || raw === "ask" || raw === "free") return "search";
  return "search";
}

function normalizeVetAiRole(value) {
  const raw = String(value || "ETO").trim();
  const lower = raw.toLowerCase();

  if (lower === "officer" || lower === "officers") return "Officers";
  if (lower === "engineer" || lower === "engineers") return "Engineers";
  if (lower === "eto") return "ETO";
  if (lower === "rating" || lower === "ratings") return "Ratings";
  if (lower === "catering" || lower === "cook" || lower === "galley") return "Catering";

  return raw || "ETO";
}

function normalizeVetAiAction(value) {
  const raw = String(value || "ask")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_");

  if (["question", "next", "next_question", "new_question"].includes(raw)) return "next_question";
  if (["answer", "show_answer", "show", "reveal_answer"].includes(raw)) return "show_answer";
  if (["prepare", "checklist", "make_checklist"].includes(raw)) return "prepare";
  if (["ask", "search", "free_question"].includes(raw)) return "ask";

  return raw || "ask";
}

function getVetAiPromptVariableName(mode) {
  if (mode === "cards") return "PROMPT_VETAI_CARDS";
  if (mode === "prepare") return "PROMPT_VETAI_PREPARE";
  if (mode === "search") return "PROMPT_VETAI_SEARCH";
  return "PROMPT_VETAI_SEARCH";
}

function getVetAiModePrompt(env, mode) {
  if (mode === "cards") return String(env.PROMPT_VETAI_CARDS || "").trim();
  if (mode === "prepare") return String(env.PROMPT_VETAI_PREPARE || "").trim();
  if (mode === "search") return String(env.PROMPT_VETAI_SEARCH || "").trim();
  return String(env.PROMPT_VETAI_SEARCH || "").trim();
}

function buildVetAiSystemPrompt(env, mode) {
  const baseSystemPrompt = String(env.SYSTEM_PROMPT || "").trim();
  const modePrompt = getVetAiModePrompt(env, mode);

  return [
    baseSystemPrompt,
    modePrompt,
  ].filter(Boolean).join("\n\n");
}

function buildVetAiUserRequest({ mode, role, action, topic, userText, lastCard }) {
  const payload = {
    mode,
    role,
    action,
    topic: topic || "",
    text: userText || "",
    lastCard: lastCard || null,
  };

  return JSON.stringify(payload, null, 2);
}

// --- KV keys (only for memory + last image state) ---
function keyHistory(chatId) {
  return `chat:${chatId}:history`;
}
function keyLastImage(chatId) {
  return `chat:${chatId}:last_image`;
}
function keyImageMissCount(chatId) {
  return `chat:${chatId}:image_miss_count`;
}
function keyVetAiLastCard(chatId) {
  return `chat:${chatId}:vetai_last_card`;
}

// --- history helpers ---
function trimHistory(messages, N) {
  if (!Array.isArray(messages)) return [];
  if (!Number.isFinite(N) || N <= 0) return messages;
  if (messages.length <= N) return messages;
  return messages.slice(messages.length - N);
}

async function loadHistory(KV, chatId) {
  const raw = await KV.get(keyHistory(chatId));
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    const messages = Array.isArray(data) ? data : data?.messages;
    if (!Array.isArray(messages)) return [];
    return messages
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant" || m.role === "system") &&
          typeof m.content === "string"
      )
      .map((m) => ({ role: m.role, content: m.content }));
  } catch {
    return [];
  }
}

async function saveHistory(KV, chatId, messages) {
  const payload = JSON.stringify({ messages, updatedAt: Date.now() });
  await KV.put(keyHistory(chatId), payload);
}

// --- image miss count helpers ---
async function getImageMissCount(KV, chatId) {
  const raw = await KV.get(keyImageMissCount(chatId));
  const n = Number(String(raw ?? "").trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}
async function setImageMissCount(KV, chatId, n) {
  const safe = Math.max(0, Math.min(99, Math.floor(Number(n) || 0)));
  await KV.put(keyImageMissCount(chatId), String(safe));
}
async function clearImageMissCount(KV, chatId) {
  await KV.delete(keyImageMissCount(chatId));
}

// --- VISION_DETAIL: low/high/auto only ---
function getVisionDetail(env) {
  const raw = (env.VISION_DETAIL || "auto").toString().trim().toLowerCase();
  if (raw === "low" || raw === "high" || raw === "auto") return raw;
  console.log("VISION_DETAIL invalid -> using auto. Got:", raw);
  return "auto";
}

// --- STT model ---
function getSttModel(env) {
  const raw = (env.OPENAI_STT_MODEL || "gpt-4o-mini-transcribe").toString().trim();
  return raw || "gpt-4o-mini-transcribe";
}

// --- Memory window size ---
function normalizeWindowSize(raw, fallback = 16) {
  const n = Number(String(raw ?? "").trim());
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(1, Math.min(50, Math.floor(n)));
}

// --- Max output tokens ---
function normalizeMaxOutputTokens(raw) {
  const n = Number(String(raw ?? "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(16, Math.min(8000, Math.floor(n)));
}

// --- Reasoning effort ---
function normalizeReasoningEffort(raw) {
  const v = String(raw ?? "none").trim().toLowerCase();
  if (v === "none" || v === "") return "none";
  if (v === "low" || v === "medium" || v === "high") return v;
  return "none";
}

// --- Detect "not found on image" answers (RU/EN light heuristic) ---
function isImageMissAnswer(text) {
  const t = String(text || "").toLowerCase();
  const anchors = [
    "на фото",
    "на фотографии",
    "на снимке",
    "на изображении",
    "на картинке",
    "на этом фото",
    "на этой фотографии",
    "на этом изображении",
    "in the photo",
    "in the image",
    "in this photo",
    "in this image",
    "in the picture",
  ];
  const missWords = [
    "нет",
    "не видно",
    "не вижу",
    "не показано",
    "отсутств",
    "cannot see",
    "can't see",
    "not visible",
    "not shown",
    "not in the photo",
    "not in the image",
  ];
  const hasAnchor = anchors.some((a) => t.includes(a));
  if (!hasAnchor) return false;
  return missWords.some((w) => t.includes(w));
}

function safeJson(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseMaybeJsonObject(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;

  const unfenced = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(unfenced);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// ======================================================
// D1 helpers
// ======================================================
async function ensureSchema(DB) {
  // Ты уже создал messages вручную, но это безопасно (IF NOT EXISTS).
  // Если таблица пропадёт — воркер восстановит.
  const sql = `
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  tg_message_id TEXT,
  direction TEXT,
  role TEXT,
  kind TEXT,
  text TEXT,
  file_id TEXT,
  meta_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;
  try {
    await DB.prepare(sql).run();
  } catch (e) {
    console.log("D1 ensureSchema error:", e?.message || e);
  }
}

async function d1InsertMessage(DB, row) {
  const {
    chat_id,
    tg_message_id,
    direction,
    role,
    kind,
    text,
    file_id,
    meta_json,
  } = row;

  const sql = `
INSERT INTO messages
(chat_id, tg_message_id, direction, role, kind, text, file_id, meta_json)
VALUES (?, ?, ?, ?, ?, ?, ?, ?);
`;
  try {
    await DB.prepare(sql)
      .bind(
        String(chat_id),
        tg_message_id == null ? null : String(tg_message_id),
        direction == null ? null : String(direction),
        role == null ? null : String(role),
        kind == null ? null : String(kind),
        text == null ? null : String(text),
        file_id == null ? null : String(file_id),
        meta_json == null ? null : String(meta_json)
      )
      .run();
  } catch (e) {
    console.log("D1 insert error:", e?.message || e, "row.kind=", kind);
  }
}

async function d1LogIn(DB, { chatId, tgMessageId, role, kind, text, fileId, meta }) {
  return d1InsertMessage(DB, {
    chat_id: chatId,
    tg_message_id: tgMessageId ?? null,
    direction: "in",
    role: role ?? "user",
    kind,
    text: text ?? null,
    file_id: fileId ?? null,
    meta_json: meta ? JSON.stringify(meta) : null,
  });
}

async function d1LogOut(DB, { chatId, tgMessageId, role, kind, text, meta }) {
  return d1InsertMessage(DB, {
    chat_id: chatId,
    tg_message_id: tgMessageId ?? null,
    direction: "out",
    role: role ?? "assistant",
    kind,
    text: text ?? null,
    file_id: null,
    meta_json: meta ? JSON.stringify(meta) : null,
  });
}

// ======================================================
// VetAI browser chat handler
// ======================================================
async function handleVetAiChat(request, env, KV, DB, origin, auth) {
  if (!KV) {
    return corsJson({
      ok: false,
      error: "KV binding CHAT_MEMORY is not configured",
    }, origin, 500);
  }

  const body = await readJsonBody(request);

  const mode = normalizeVetAiMode(body.mode || "search");
  const role = normalizeVetAiRole(body.role || "ETO");
  const action = normalizeVetAiAction(body.action || "ask");
  const topic = String(body.topic || "").trim();
  const userText = String(body.message || body.text || body.question || "").trim();

  if (mode === "search" && !userText && !topic) {
    return corsJson({
      ok: false,
      error: "Message or topic is required for search mode",
    }, origin, 400);
  }

  const sessionId = sanitizeSessionId(body.sessionId || body.session_id || "default");
  const chatId = `vetai:noprompt:v1:${auth.ownerTokenHash}:${sessionId}:${mode}:${role}`;
  const model = String(env.OPENAI_MODEL || "gpt-5.2").trim() || "gpt-5.2";
  const systemPrompt = buildVetAiSystemPrompt(env, mode);
  const modePrompt = getVetAiModePrompt(env, mode);
  const promptVariable = getVetAiPromptVariableName(mode);
  const N = normalizeWindowSize(env.MEMORY_WINDOW_SIZE, 16);

  const lastCardRaw = mode === "cards" ? await KV.get(keyVetAiLastCard(chatId)) : null;
  const lastCard = safeJson(lastCardRaw);
  const requestText = buildVetAiUserRequest({ mode, role, action, topic, userText, lastCard });

  if (DB) {
    await ensureSchema(DB);
    await d1LogIn(DB, {
      chatId,
      tgMessageId: null,
      kind: "vetai_text",
      text: requestText,
      meta: {
        source: "web",
        sessionId,
        mode,
        role,
        action,
        topic,
        userText,
        promptVariable,
        modePromptConfigured: !!modePrompt,
        hasLastCard: !!lastCard,
      },
    });
  }

  let history = await loadHistory(KV, chatId);
  history = history.filter((m) => m.role !== "system");
  history.push({ role: "user", content: requestText });

  const trimmed = trimHistory(history, N);

  const answer = await askOpenAIText(env, {
    model,
    systemPrompt,
    messages: trimmed,
    useFileSearch: true,
  });

  const finalAnswer = String(answer || "").trim() || "Пустой ответ. Попробуй ещё раз.";
  const structured = parseMaybeJsonObject(finalAnswer);

  if (mode === "cards" && action === "next_question" && structured) {
    await KV.put(keyVetAiLastCard(chatId), JSON.stringify({
      role,
      topic,
      card: structured,
      createdAt: new Date().toISOString(),
    }));
  }

  trimmed.push({ role: "assistant", content: finalAnswer });
  await saveHistory(KV, chatId, trimHistory(trimmed, N));

  if (DB) {
    await d1LogOut(DB, {
      chatId,
      tgMessageId: null,
      kind: "vetai_answer",
      text: finalAnswer,
      meta: {
        source: "web",
        sessionId,
        mode,
        role,
        action,
        topic,
        structured: !!structured,
      },
    });
  }

  return corsJson({
    ok: true,
    sessionId,
    mode,
    role,
    action,
    topic,
    promptVariable,
    modePromptConfigured: !!modePrompt,
    answer: finalAnswer,
    result: finalAnswer,
    card: structured || null,
  }, origin);
}

// ======================================================
// Telegram update handler
// ======================================================
async function handleTelegramUpdate(env, KV, DB, update) {
  // schema guard
  await ensureSchema(DB);

  try {
    const message = update?.message;
    const chatId = message?.chat?.id;
    if (!chatId) return;

    const tgMessageId = message?.message_id ?? null;

    const text = message?.text;
    const caption = message?.caption;

    const fromMeta = {
      fromId: message?.from?.id ?? null,
      fromUser: message?.from?.username ?? null,
      fromName: [message?.from?.first_name, message?.from?.last_name]
        .filter(Boolean)
        .join(" "),
    };

    // /start
    if (text === "/start") {
      await d1LogIn(DB, {
        chatId,
        tgMessageId,
        kind: "command_start",
        text: "/start",
        meta: fromMeta,
      });

      const hello =
        "Привет! Можешь писать текст, прислать фото, или записать голосовое (я сделаю транскрипцию).";
      await tgSendMessage(env, chatId, hello);
      await d1LogOut(DB, { chatId, kind: "answer", text: hello });
      return;
    }

    // /reset -> чистим history + last_image + image_miss_count (лог D1 НЕ трогаем)
    if (text === "/reset") {
      await d1LogIn(DB, {
        chatId,
        tgMessageId,
        kind: "command_reset",
        text: "/reset",
        meta: fromMeta,
      });

      await KV.delete(keyHistory(chatId));
      await KV.delete(keyLastImage(chatId));
      await clearImageMissCount(KV, chatId);

      const msg = "Ок, память (history) + last_image очищены ✅";
      await tgSendMessage(env, chatId, msg);
      await d1LogOut(DB, { chatId, kind: "answer", text: msg });
      return;
    }

    // /clearimage
    if (text === "/clearimage") {
      await d1LogIn(DB, {
        chatId,
        tgMessageId,
        kind: "command_clearimage",
        text: "/clearimage",
        meta: fromMeta,
      });

      await KV.delete(keyLastImage(chatId));
      await clearImageMissCount(KV, chatId);

      const msg = "Ок, последняя картинка забыта ✅";
      await tgSendMessage(env, chatId, msg);
      await d1LogOut(DB, { chatId, kind: "answer", text: msg });
      return;
    }

    // Settings (env)
    const systemPrompt = (env.SYSTEM_PROMPT || "").trim();
    const model = (env.OPENAI_MODEL || "gpt-5.2").trim();
    const N = normalizeWindowSize(env.MEMORY_WINDOW_SIZE, 16);

    // ======================================================
    // 1) IMAGE
    // ======================================================
    const photoFileId = pickTelegramPhotoFileId(message);
    const docFileId = pickTelegramDocumentImageFileId(message);
    const imageFileId = photoFileId || docFileId;

    if (imageFileId) {
      // Save last image (KV state)
      await KV.put(keyLastImage(chatId), JSON.stringify({ file_id: imageFileId, ts: Date.now() }));
      await clearImageMissCount(KV, chatId);

      // Log incoming image to D1
      await d1LogIn(DB, {
        chatId,
        tgMessageId,
        kind: photoFileId ? "photo" : "document_image",
        text: (caption || "").toString(),
        fileId: imageFileId,
        meta: { ...fromMeta },
      });

      const question =
        (caption && caption.trim()) ||
        "Опиши изображение. Если там текст — прочитай. Если это устройство/схема — объясни что это и на что смотреть.";

      // Memory (KV history)
      let history = await loadHistory(KV, chatId);
      history = history.filter((m) => m.role !== "system");
      history.push({ role: "user", content: `[image] ${question}` });

      let trimmedForStore = trimHistory(history, N);

      const answer = await askOpenAIWithOptionalImage(env, {
        model,
        systemPrompt,
        historyTextMessages: trimHistory(history.slice(0, -1), N),
        userText: question,
        imageFileId,
        visionDetail: getVisionDetail(env),
      });

      const finalAnswer = (answer && String(answer).trim()) || "Пустой ответ. Попробуй ещё раз.";

      trimmedForStore.push({ role: "assistant", content: finalAnswer });
      trimmedForStore = trimHistory(trimmedForStore, N);
      await saveHistory(KV, chatId, trimmedForStore);

      // Log outgoing answer to D1
      await d1LogOut(DB, { chatId, kind: "answer", text: finalAnswer });

      await tgSendMessage(env, chatId, finalAnswer);
      return;
    }

    // ======================================================
    // 2) AUDIO -> STT -> TEXT PIPE
    // ======================================================
    const voiceFileId = message?.voice?.file_id ?? null;
    const audioFileId = message?.audio?.file_id ?? null;
    const audioAnyFileId = voiceFileId || audioFileId;

    if (audioAnyFileId) {
      const kind = voiceFileId ? "voice" : "audio";

      // безопасно достаём duration/mime
      const duration = message?.voice?.duration ?? message?.audio?.duration ?? null;
      const mime_type = message?.voice?.mime_type ?? message?.audio?.mime_type ?? null;

      // Log incoming audio to D1
      await d1LogIn(DB, {
        chatId,
        tgMessageId,
        kind,
        text: null,
        fileId: audioAnyFileId,
        meta: { ...fromMeta, duration, mime_type },
      });

      const tgToken = (env.TELEGRAM_BOT_TOKEN || "").trim();
      if (!tgToken) {
        const err = "Ошибка: нет TELEGRAM_BOT_TOKEN в Secrets.";
        await tgSendMessage(env, chatId, err);
        await d1LogOut(DB, { chatId, kind: "error", text: err });
        return;
      }

      const fileUrl = await telegramFileIdToFileUrl(tgToken, audioAnyFileId);
      if (!fileUrl) {
        const err = "Не смог получить аудио из Telegram (getFile).";
        await tgSendMessage(env, chatId, err);
        await d1LogOut(DB, { chatId, kind: "error", text: err });
        return;
      }

      const fileResp = await fetch(fileUrl);
      if (!fileResp.ok) {
        const err = `Не смог скачать аудио: ${fileResp.status}`;
        await tgSendMessage(env, chatId, err);
        await d1LogOut(DB, { chatId, kind: "error", text: err });
        return;
      }

      const buf = await fileResp.arrayBuffer();
      const mimeFromTelegram =
        mime_type ||
        fileResp.headers.get("content-type") ||
        "application/octet-stream";

      const filename =
        kind === "voice"
          ? "voice.ogg"
          : guessFilenameFromMime(mimeFromTelegram) || "audio.bin";

      const transcript = await sttTranscribeOpenAI(env, {
        arrayBuffer: buf,
        mimeType: mimeFromTelegram,
        filename,
      });

      const cleaned = (transcript || "").trim();
      if (!cleaned) {
        const err = "Не получилось распознать речь (пустой transcript).";
        await tgSendMessage(env, chatId, err);
        await d1LogOut(DB, { chatId, kind: "error", text: err });
        return;
      }

      // Log transcript to D1
      await d1LogIn(DB, {
        chatId,
        tgMessageId,
        kind: "stt_transcript",
        text: cleaned,
        fileId: audioAnyFileId,
        meta: { stt_model: getSttModel(env), source: kind },
      });

      const { answerToSend, finalAnswer } = await processUserText(env, KV, DB, {
        chatId,
        tgMessageId,
        userText: cleaned,
        systemPrompt,
        model,
        N,
        sourceKind: kind,
        fromMeta,
      });

      await tgSendMessage(env, chatId, answerToSend);

      // Log outgoing answer to D1 (полный ответ)
      await d1LogOut(DB, { chatId, kind: "answer", text: finalAnswer });

      return;
    }

    // ======================================================
    // 3) TEXT
    // ======================================================
    if (!text || typeof text !== "string") {
      const msg = "Я понимаю текст, фото и голосовые. Пришли что-нибудь из этого.";
      await tgSendMessage(env, chatId, msg);
      await d1LogOut(DB, { chatId, kind: "answer", text: msg });
      return;
    }

    // Log incoming text to D1
    await d1LogIn(DB, {
      chatId,
      tgMessageId,
      kind: "text",
      text,
      meta: fromMeta,
    });

    const { answerToSend, finalAnswer } = await processUserText(env, KV, DB, {
      chatId,
      tgMessageId,
      userText: text,
      systemPrompt,
      model,
      N,
      sourceKind: "text",
      fromMeta,
    });

    await tgSendMessage(env, chatId, answerToSend);
    await d1LogOut(DB, { chatId, kind: "answer", text: finalAnswer });
  } catch (e) {
    console.log("handleTelegramUpdate error:", e);
    try {
      const chatId = update?.message?.chat?.id;
      if (chatId) await tgSendMessage(env, chatId, `Ошибка: ${e?.message || "unknown"}`);
    } catch {}
  }
}

// ======================================================
// Core text processing (KV memory + optional image mode)
// ======================================================
async function processUserText(env, KV, DB, { chatId, tgMessageId, userText, systemPrompt, model, N, sourceKind, fromMeta }) {
  let history = await loadHistory(KV, chatId);
  history = history.filter((m) => m.role !== "system");
  history.push({ role: "user", content: userText });

  let trimmed = trimHistory(history, N);

  const lastImageRaw = await KV.get(keyLastImage(chatId));
  const lastImage = safeJson(lastImageRaw);
  const lastImageFileId = lastImage?.file_id || null;

  let answer;
  const usedImage = !!lastImageFileId;

  if (usedImage) {
    answer = await askOpenAIWithOptionalImage(env, {
      model,
      systemPrompt,
      historyTextMessages: trimHistory(history.slice(0, -1), N),
      userText,
      imageFileId: lastImageFileId,
      visionDetail: getVisionDetail(env),
    });
  } else {
    answer = await askOpenAIText(env, {
      model,
      systemPrompt,
      messages: trimmed,
    });
  }

  const finalAnswer = (answer && String(answer).trim()) || "Пустой ответ. Попробуй ещё раз.";

  // ---- Vision Plus auto-clear: 2 misses -> delete last image ----
  if (usedImage) {
    const miss = isImageMissAnswer(finalAnswer);
    if (miss) {
      const cur = await getImageMissCount(KV, chatId);
      const next = cur + 1;
      await setImageMissCount(KV, chatId, next);

      if (next >= 2) {
        await KV.delete(keyLastImage(chatId));
        await clearImageMissCount(KV, chatId);

        // log autoclear into D1 as system-ish event
        await d1LogIn(DB, {
          chatId,
          tgMessageId,
          kind: "vision_plus_autoclear",
          text: "last_image cleared after 2 misses",
          meta: { reason: "image_miss_twice" },
        });
      }
    } else {
      await clearImageMissCount(KV, chatId);
    }
  }

  // ---- save history in KV ----
  trimmed.push({ role: "assistant", content: finalAnswer });
  const trimmedForStore = trimHistory(trimmed, N);
  await saveHistory(KV, chatId, trimmedForStore);

  const answerToSend =
    sourceKind === "voice" || sourceKind === "audio"
      ? `📝 Транскрипция:\n${userText}\n\n🤖 Ответ:\n${finalAnswer}`
      : finalAnswer;

  return { answerToSend, finalAnswer };
}

// ======================================================
// Telegram: pick image file_id
// ======================================================
function pickTelegramPhotoFileId(message) {
  const arr = message?.photo;
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const best = arr[arr.length - 1];
  return best?.file_id || null;
}

function pickTelegramDocumentImageFileId(message) {
  const doc = message?.document;
  if (!doc) return null;
  const mime = (doc.mime_type || "").toLowerCase();
  if (!mime.startsWith("image/")) return null;
  return doc.file_id || null;
}

// ======================================================
// OpenAI calls (Responses API)
// ======================================================
function extractOpenAIText(data) {
  if (!data) return "";
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text;

  const out = data.output;
  if (Array.isArray(out)) {
    let parts = [];
    for (const item of out) {
      const content = item?.content;
      if (!Array.isArray(content)) continue;
      for (const c of content) {
        if ((c?.type === "output_text" || c?.type === "text") && typeof c?.text === "string") {
          parts.push(c.text);
        }
        if (typeof c?.content === "string") parts.push(c.content);
      }
    }
    return parts.join("\n").trim();
  }
  return "";
}

function buildOpenAIPayload(env, base) {
  const payload = { ...base };

  const maxTok = normalizeMaxOutputTokens(env.OPENAI_MAX_OUTPUT_TOKENS);
  if (maxTok) payload.max_output_tokens = maxTok;

  const effort = normalizeReasoningEffort(env.OPENAI_REASONING_EFFORT);
  if (effort !== "none") payload.reasoning = { effort };

  return payload;
}

async function askOpenAIText(env, { model, systemPrompt, messages, useFileSearch = false }) {
  const apiKey = (env.OPENAI_API_KEY || "").trim();
  if (!apiKey) return "Ошибка: нет OPENAI_API_KEY в Secrets.";

  const input = [
    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
    ...(Array.isArray(messages) ? messages : []),
  ];

  const basePayload = { model, input };

  if (useFileSearch) {
    const vectorStoreId = String(env.SIRE_VECTOR_STORE_ID || "").trim();
    if (!vectorStoreId) {
      return "Ошибка: SIRE_VECTOR_STORE_ID is not configured in Worker variables.";
    }

    basePayload.tools = [
      {
        type: "file_search",
        vector_store_ids: [vectorStoreId],
      },
    ];
  }

  const payload = buildOpenAIPayload(env, basePayload);

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await resp.text().catch(() => "");
  if (!resp.ok) {
    console.log("OpenAI error:", resp.status, raw);
    return `Ошибка OpenAI: ${raw || resp.status}`;
  }

  let data = null;
  try {
    data = JSON.parse(raw);
  } catch {
    return (raw || "").toString();
  }

  return extractOpenAIText(data) || "";
}

async function askOpenAIWithOptionalImage(env, {
  model,
  systemPrompt,
  historyTextMessages,
  userText,
  imageFileId,
  visionDetail,
}) {
  const apiKey = (env.OPENAI_API_KEY || "").trim();
  if (!apiKey) return "Ошибка: нет OPENAI_API_KEY в Secrets.";

  const tgToken = (env.TELEGRAM_BOT_TOKEN || "").trim();
  if (!tgToken) return "Ошибка: нет TELEGRAM_BOT_TOKEN в Secrets.";

  const imageUrl = await telegramFileIdToFileUrl(tgToken, imageFileId);
  if (!imageUrl) return "Не смог получить картинку из Telegram (getFile).";

  const userContent = [
    { type: "input_text", text: userText },
    { type: "input_image", image_url: imageUrl, detail: visionDetail },
  ];

  const input = [
    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
    ...(Array.isArray(historyTextMessages) ? historyTextMessages : []),
    { role: "user", content: userContent },
  ];

  const payload = buildOpenAIPayload(env, { model, input });

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await resp.text().catch(() => "");
  if (!resp.ok) {
    console.log("OpenAI error:", resp.status, raw);
    return `Ошибка OpenAI: ${raw || resp.status}`;
  }

  let data = null;
  try {
    data = JSON.parse(raw);
  } catch {
    return (raw || "").toString();
  }

  return extractOpenAIText(data) || "";
}

// ======================================================
// OpenAI: Speech-to-Text (STT)
// ======================================================
async function sttTranscribeOpenAI(env, { arrayBuffer, mimeType, filename }) {
  const apiKey = (env.OPENAI_API_KEY || "").trim();
  if (!apiKey) return "Ошибка: нет OPENAI_API_KEY в Secrets.";

  const model = getSttModel(env);

  const form = new FormData();
  const blob = new Blob([arrayBuffer], { type: mimeType || "application/octet-stream" });

  form.append("file", blob, filename || "audio.bin");
  form.append("model", model);
  form.append("response_format", "text");

  const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  const raw = await resp.text().catch(() => "");
  if (!resp.ok) {
    console.log("OpenAI STT error:", resp.status, raw);
    return `Ошибка STT OpenAI: ${raw || resp.status}`;
  }

  try {
    const data = JSON.parse(raw);
    return (data?.text || "").toString();
  } catch {
    return (raw || "").toString();
  }
}

function guessFilenameFromMime(mime) {
  const m = (mime || "").toLowerCase();
  if (m.includes("ogg") || m.includes("opus")) return "audio.ogg";
  if (m.includes("mpeg") || m.includes("mp3")) return "audio.mp3";
  if (m.includes("wav")) return "audio.wav";
  if (m.includes("m4a") || m.includes("mp4")) return "audio.m4a";
  if (m.includes("webm")) return "audio.webm";
  return null;
}

// ======================================================
// Telegram: getFile -> file_path -> file URL
// ======================================================
async function telegramFileIdToFileUrl(token, fileId) {
  try {
    const apiUrl = `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`;
    const resp = await fetch(apiUrl);
    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data?.ok) {
      console.log("Telegram getFile failed:", resp.status, data);
      return null;
    }
    const path = data?.result?.file_path;
    if (!path) return null;
    return `https://api.telegram.org/file/bot${token}/${path}`;
  } catch (e) {
    console.log("telegramFileIdToFileUrl error:", e);
    return null;
  }
}

// ======================================================
// Telegram sendMessage
// ======================================================
async function tgSendMessage(env, chatId, text) {
  const token = (env.TELEGRAM_BOT_TOKEN || "").trim();
  if (!token) return;

  const safeText = (text == null ? "" : String(text)).trim();
  const finalText = safeText || "⚠️ Пустой ответ (внутренняя ошибка).";

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = { chat_id: chatId, text: finalText };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    console.log("Telegram sendMessage failed:", resp.status, t);
  }
}

// ======================================================
// setWebhook
// ======================================================
async function setTelegramWebhook(env, origin) {
  const token = (env.TELEGRAM_BOT_TOKEN || "").trim();
  if (!token) return json({ ok: false, error: "No TELEGRAM_BOT_TOKEN" }, 500);

  const webhookUrl = `${origin}/telegram/webhook`;
  const secret = (env.TG_SECRET_TOKEN || "").trim();

  const apiUrl = new URL(`https://api.telegram.org/bot${token}/setWebhook`);
  apiUrl.searchParams.set("url", webhookUrl);
  if (secret) apiUrl.searchParams.set("secret_token", secret);

  const resp = await fetch(apiUrl.toString());
  const bodyText = await resp.text().catch(() => "");
  return new Response(bodyText, {
    status: resp.status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
