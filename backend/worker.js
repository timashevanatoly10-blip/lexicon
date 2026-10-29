const ALLOWED_ORIGINS = [
  "https://timashevanatoly10-blip.github.io",
  "https://mylexicon.pages.dev",
  "https://pwa-ui-5jh.pages.dev"
];

const DEFAULT_OPENAI_MODEL = "gpt-5.2";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin)
      });
    }

    try {
      if (request.method === "GET" && url.pathname === "/api/dictionaries") {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        return await handleGetDictionaries(env, origin, auth.ownerTokenHash);
      }

      if (request.method === "POST" && url.pathname === "/api/dictionaries") {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        return await handleCreateDictionary(request, env, origin, auth.ownerTokenHash);
      }

      if (
        (request.method === "PUT" || request.method === "DELETE") &&
        /^\/api\/dictionaries\/[^/]+$/.test(url.pathname)
      ) {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        const dictionaryId = decodeURIComponent(url.pathname.split("/").pop() || "");

        if (request.method === "PUT") {
          return await handleUpdateDictionary(request, env, origin, auth.ownerTokenHash, dictionaryId);
        }

        return await handleDeleteDictionary(env, origin, auth.ownerTokenHash, dictionaryId);
      }

      if (
        request.method === "POST" &&
        /^\/api\/dictionaries\/[^/]+\/words$/.test(url.pathname)
      ) {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        const parts = url.pathname.split("/");
        const dictionaryId = decodeURIComponent(parts[3] || "");

        return await handleCreateDictionaryWord(request, env, origin, auth.ownerTokenHash, dictionaryId);
      }

      if (
        request.method === "PUT" &&
        /^\/api\/dictionaries\/[^/]+\/words\/[^/]+\/meta$/.test(url.pathname)
      ) {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        const parts = url.pathname.split("/");
        const dictionaryId = decodeURIComponent(parts[3] || "");
        const wordId = decodeURIComponent(parts[5] || "");

        return await handleUpdateDictionaryWordMeta(request, env, origin, auth.ownerTokenHash, dictionaryId, wordId);
      }

      if (
        request.method === "DELETE" &&
        /^\/api\/dictionaries\/[^/]+\/words\/[^/]+$/.test(url.pathname)
      ) {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        const parts = url.pathname.split("/");
        const dictionaryId = decodeURIComponent(parts[3] || "");
        const wordId = decodeURIComponent(parts[5] || "");

        return await handleDeleteDictionaryWord(env, origin, auth.ownerTokenHash, dictionaryId, wordId);
      }

      if (
        request.method === "POST" &&
        /^\/api\/dictionaries\/[^/]+\/public-link$/.test(url.pathname)
      ) {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        const parts = url.pathname.split("/");
        const dictionaryId = decodeURIComponent(parts[3] || "");

        return await handleCreateDictionaryPublicLink(request, env, origin, auth.ownerTokenHash, dictionaryId, url);
      }

      if (
        request.method === "DELETE" &&
        /^\/api\/dictionaries\/[^/]+\/public-link$/.test(url.pathname)
      ) {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        const parts = url.pathname.split("/");
        const dictionaryId = decodeURIComponent(parts[3] || "");

        return await handleDeactivateDictionaryPublicLink(env, origin, auth.ownerTokenHash, dictionaryId);
      }


      if (request.method === "GET" && url.pathname === "/api/inbox") {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        return await handleGetInboxItems(env, origin, auth.ownerTokenHash);
      }

      if (request.method === "POST" && url.pathname === "/api/inbox") {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        return await handleCreateInboxItem(request, env, origin, auth.ownerTokenHash);
      }

      if (request.method === "POST" && url.pathname === "/api/inbox/merge") {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        return await handleMergeInboxItems(request, env, origin, auth.ownerTokenHash);
      }

      if (request.method === "POST" && url.pathname === "/api/inbox/folders") {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        return await handleCreateInboxFolder(request, env, origin, auth.ownerTokenHash);
      }

      if (request.method === "POST" && url.pathname === "/api/inbox/folders/move") {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        return await handleMoveInboxFolder(request, env, origin, auth.ownerTokenHash);
      }

      if (
        (request.method === "PUT" || request.method === "DELETE") &&
        /^\/api\/inbox\/folders\/[^/]+$/.test(url.pathname)
      ) {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        const folderId = decodeURIComponent(url.pathname.split("/").pop() || "");

        if (request.method === "PUT") {
          return await handleUpdateInboxFolder(request, env, origin, auth.ownerTokenHash, folderId);
        }

        return await handleDeleteInboxFolder(env, origin, auth.ownerTokenHash, folderId);
      }

      if (request.method === "POST" && url.pathname === "/api/inbox/move") {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        return await handleMoveInboxItems(request, env, origin, auth.ownerTokenHash);
      }

      if (request.method === "POST" && url.pathname === "/api/inbox/reorder") {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        return await handleReorderInboxEntity(request, env, origin, auth.ownerTokenHash);
      }

      if (
        (request.method === "PUT" || request.method === "DELETE") &&
        /^\/api\/inbox\/[^/]+$/.test(url.pathname)
      ) {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        const inboxItemId = decodeURIComponent(url.pathname.split("/").pop() || "");

        if (request.method === "PUT") {
          return await handleUpdateInboxItem(request, env, origin, auth.ownerTokenHash, inboxItemId);
        }

        return await handleDeleteInboxItem(env, origin, auth.ownerTokenHash, inboxItemId);
      }

      if (
        request.method === "GET" &&
        /^\/public\/dictionary\/[^/]+$/.test(url.pathname)
      ) {
        const shareId = decodeURIComponent(url.pathname.split("/").pop() || "");

        return await handleGetPublicDictionary(env, origin, shareId);
      }


      if (request.method === "POST" && url.pathname === "/api/text/import") {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        return await handleTextImport(request, env, origin);
      }

      if (request.method === "GET") {
        return jsonResponse({ ok: true, service: "lexicon-worker" }, origin);
      }

      if (request.method === "POST" && url.pathname === "/api/upload") {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        return await handleUpload(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/api/status") {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        return await handleStatus(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/api/download") {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        return await handleDownload(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/api/ai") {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        return await handleAi(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/api/audio/transcribe") {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        return await handleAudioTranscribe(request, env, origin);
      }


      if (request.method === "POST" && url.pathname === "/api/vision/extract-text") {
        const auth = await requireAuthContext(request, env, origin);
        if (auth.response) return auth.response;

        return await handleVisionExtractText(request, env, origin);
      }

      return jsonResponse({ ok: false, error: "Not found" }, origin, 404);

    } catch (err) {
      return jsonResponse({
        ok: false,
        error: String(err && err.message ? err.message : err)
      }, origin, 500);
    }
  }
};

async function requireAuthContext(request, env, origin) {
  const rawTokens = env.ACCESS_TOKENS || "";
  const allowedTokens = rawTokens
    .split(",")
    .map(token => token.trim())
    .filter(Boolean);

  if (!allowedTokens.length) {
    return {
      response: jsonResponse({
        ok: false,
        error: "ACCESS_TOKENS is not configured"
      }, origin, 500)
    };
  }

  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";

  if (!token || !allowedTokens.includes(token)) {
    return {
      response: jsonResponse({
        ok: false,
        error: "Unauthorized"
      }, origin, 401)
    };
  }

  return {
    response: null,
    token,
    ownerTokenHash: await sha256Hex(token)
  };
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}



// ===== D1 DICTIONARIES =====

function requireDb(env, origin) {
  if (!env.DB) {
    return jsonResponse({
      ok: false,
      error: "D1 binding DB is not configured"
    }, origin, 500);
  }

  return null;
}

async function handleGetDictionaries(env, origin, ownerTokenHash) {
  const dbError = requireDb(env, origin);
  if (dbError) return dbError;

  const dictionariesResult = await env.DB.prepare(`
    SELECT
      id,
      title,
      note,
      created_at,
      updated_at
    FROM dictionaries
    WHERE owner_token_hash = ?
    ORDER BY updated_at DESC, created_at DESC
  `).bind(ownerTokenHash).all();

  const wordsResult = await env.DB.prepare(`
    SELECT
      id,
      dictionary_id,
      word,
      transcription,
      translation,
      part_of_speech,
      meta,
      created_at,
      updated_at
    FROM dictionary_words
    WHERE owner_token_hash = ?
    ORDER BY created_at DESC
  `).bind(ownerTokenHash).all();

  const dictionaries = (dictionariesResult.results || []).map(row => ({
    id: row.id,
    title: row.title,
    note: row.note || "",
    words: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));

  const byId = new Map(dictionaries.map(dict => [dict.id, dict]));

  for (const row of wordsResult.results || []) {
    const dict = byId.get(row.dictionary_id);
    if (!dict) continue;

    dict.words.push(rowToWord(row));
  }

  return jsonResponse({
    ok: true,
    dictionaries
  }, origin);
}

async function handleCreateDictionary(request, env, origin, ownerTokenHash) {
  const dbError = requireDb(env, origin);
  if (dbError) return dbError;

  const body = await readJsonBody(request);
  const title = String(body.title || "").trim() || "Новый словарь";
  const note = String(body.note || "").trim() || "личный словарь";
  const now = new Date().toISOString();
  const id = String(body.id || "").trim() || uid("dict");

  await env.DB.prepare(`
    INSERT INTO dictionaries (
      id,
      owner_token_hash,
      title,
      note,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      note = excluded.note,
      updated_at = excluded.updated_at
    WHERE owner_token_hash = excluded.owner_token_hash
  `).bind(id, ownerTokenHash, title, note, now, now).run();

  const saved = await env.DB.prepare(`
    SELECT
      id,
      title,
      note,
      created_at,
      updated_at
    FROM dictionaries
    WHERE id = ? AND owner_token_hash = ?
  `).bind(id, ownerTokenHash).first();

  if (!saved) {
    return jsonResponse({
      ok: false,
      error: "Dictionary id already belongs to another account"
    }, origin, 409);
  }

  return jsonResponse({
    ok: true,
    dictionary: {
      id: saved.id,
      title: saved.title,
      note: saved.note || "",
      words: [],
      createdAt: saved.created_at,
      updatedAt: saved.updated_at
    }
  }, origin);
}

async function handleUpdateDictionary(request, env, origin, ownerTokenHash, dictionaryId) {
  const dbError = requireDb(env, origin);
  if (dbError) return dbError;

  if (!dictionaryId) {
    return jsonResponse({ ok: false, error: "Dictionary id is required" }, origin, 400);
  }

  const body = await readJsonBody(request);
  const title = String(body.title || "").trim();
  const note = body.note === undefined ? null : String(body.note || "").trim();
  const now = new Date().toISOString();

  if (!title && note === null) {
    return jsonResponse({ ok: false, error: "Nothing to update" }, origin, 400);
  }

  const existing = await env.DB.prepare(`
    SELECT id, title, note
    FROM dictionaries
    WHERE id = ? AND owner_token_hash = ?
  `).bind(dictionaryId, ownerTokenHash).first();

  if (!existing) {
    return jsonResponse({ ok: false, error: "Dictionary not found" }, origin, 404);
  }

  const nextTitle = title || existing.title || "Без названия";
  const nextNote = note === null ? (existing.note || "") : note;

  await env.DB.prepare(`
    UPDATE dictionaries
    SET title = ?, note = ?, updated_at = ?
    WHERE id = ? AND owner_token_hash = ?
  `).bind(nextTitle, nextNote, now, dictionaryId, ownerTokenHash).run();

  return jsonResponse({
    ok: true,
    dictionary: {
      id: dictionaryId,
      title: nextTitle,
      note: nextNote,
      updatedAt: now
    }
  }, origin);
}

async function handleDeleteDictionary(env, origin, ownerTokenHash, dictionaryId) {
  const dbError = requireDb(env, origin);
  if (dbError) return dbError;

  if (!dictionaryId) {
    return jsonResponse({ ok: false, error: "Dictionary id is required" }, origin, 400);
  }

  await env.DB.prepare(`
    DELETE FROM dictionary_words
    WHERE dictionary_id = ? AND owner_token_hash = ?
  `).bind(dictionaryId, ownerTokenHash).run();

  await env.DB.prepare(`
    UPDATE public_dictionary_links
    SET is_active = 0, updated_at = ?
    WHERE dictionary_id = ? AND owner_token_hash = ?
  `).bind(new Date().toISOString(), dictionaryId, ownerTokenHash).run();

  const result = await env.DB.prepare(`
    DELETE FROM dictionaries
    WHERE id = ? AND owner_token_hash = ?
  `).bind(dictionaryId, ownerTokenHash).run();

  return jsonResponse({
    ok: true,
    deleted: result.meta?.changes || 0
  }, origin);
}

async function handleCreateDictionaryWord(request, env, origin, ownerTokenHash, dictionaryId) {
  const dbError = requireDb(env, origin);
  if (dbError) return dbError;

  if (!dictionaryId) {
    return jsonResponse({ ok: false, error: "Dictionary id is required" }, origin, 400);
  }

  const dict = await env.DB.prepare(`
    SELECT id
    FROM dictionaries
    WHERE id = ? AND owner_token_hash = ?
  `).bind(dictionaryId, ownerTokenHash).first();

  if (!dict) {
    return jsonResponse({ ok: false, error: "Dictionary not found" }, origin, 404);
  }

  const body = await readJsonBody(request);
  const word = String(body.word || "").trim();

  if (!word) {
    return jsonResponse({ ok: false, error: "Word is required" }, origin, 400);
  }

  const existing = await env.DB.prepare(`
    SELECT
      id,
      dictionary_id,
      word,
      transcription,
      translation,
      part_of_speech,
      meta,
      created_at,
      updated_at
    FROM dictionary_words
    WHERE dictionary_id = ?
      AND owner_token_hash = ?
      AND lower(word) = lower(?)
    LIMIT 1
  `).bind(dictionaryId, ownerTokenHash, word).first();

  if (existing) {
    return jsonResponse({
      ok: true,
      duplicate: true,
      word: rowToWord(existing)
    }, origin);
  }

  const now = new Date().toISOString();
  const id = String(body.id || "").trim() || uid("word");
  const transcription = String(body.transcription || "—").trim() || "—";
  const translation = String(body.translation || "перевод позже").trim() || "перевод позже";
  const partOfSpeech = String(body.partOfSpeech || body.part_of_speech || "").trim();
  const meta = normalizeMetaForStorage(body.meta);

  await env.DB.prepare(`
    INSERT INTO dictionary_words (
      id,
      dictionary_id,
      owner_token_hash,
      word,
      transcription,
      translation,
      part_of_speech,
      meta,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      word = excluded.word,
      transcription = excluded.transcription,
      translation = excluded.translation,
      part_of_speech = excluded.part_of_speech,
      meta = excluded.meta,
      updated_at = excluded.updated_at
    WHERE owner_token_hash = excluded.owner_token_hash
      AND dictionary_id = excluded.dictionary_id
  `).bind(
    id,
    dictionaryId,
    ownerTokenHash,
    word,
    transcription,
    translation,
    partOfSpeech,
    meta,
    now,
    now
  ).run();

  await env.DB.prepare(`
    UPDATE dictionaries
    SET updated_at = ?
    WHERE id = ? AND owner_token_hash = ?
  `).bind(now, dictionaryId, ownerTokenHash).run();

  return jsonResponse({
    ok: true,
    word: {
      id,
      word,
      transcription,
      translation,
      partOfSpeech,
      meta: parseStoredMeta(meta),
      createdAt: now,
      updatedAt: now
    }
  }, origin);
}

async function handleUpdateDictionaryWordMeta(request, env, origin, ownerTokenHash, dictionaryId, wordId) {
  const dbError = requireDb(env, origin);
  if (dbError) return dbError;

  if (!dictionaryId || !wordId) {
    return jsonResponse({
      ok: false,
      error: "Dictionary id and word id are required"
    }, origin, 400);
  }

  const body = await readJsonBody(request);
  const meta = normalizeMetaForStorage(body.meta === undefined ? body : body.meta);
  const now = new Date().toISOString();

  const existing = await env.DB.prepare(`
    SELECT id
    FROM dictionary_words
    WHERE id = ?
      AND dictionary_id = ?
      AND owner_token_hash = ?
    LIMIT 1
  `).bind(wordId, dictionaryId, ownerTokenHash).first();

  if (!existing) {
    return jsonResponse({ ok: false, error: "Word not found" }, origin, 404);
  }

  await env.DB.prepare(`
    UPDATE dictionary_words
    SET meta = ?, updated_at = ?
    WHERE id = ?
      AND dictionary_id = ?
      AND owner_token_hash = ?
  `).bind(meta, now, wordId, dictionaryId, ownerTokenHash).run();

  await env.DB.prepare(`
    UPDATE dictionaries
    SET updated_at = ?
    WHERE id = ? AND owner_token_hash = ?
  `).bind(now, dictionaryId, ownerTokenHash).run();

  const saved = await env.DB.prepare(`
    SELECT
      id,
      dictionary_id,
      word,
      transcription,
      translation,
      part_of_speech,
      meta,
      created_at,
      updated_at
    FROM dictionary_words
    WHERE id = ?
      AND dictionary_id = ?
      AND owner_token_hash = ?
    LIMIT 1
  `).bind(wordId, dictionaryId, ownerTokenHash).first();

  return jsonResponse({
    ok: true,
    word: rowToWord(saved)
  }, origin);
}

async function handleDeleteDictionaryWord(env, origin, ownerTokenHash, dictionaryId, wordId) {
  const dbError = requireDb(env, origin);
  if (dbError) return dbError;

  if (!dictionaryId || !wordId) {
    return jsonResponse({
      ok: false,
      error: "Dictionary id and word id are required"
    }, origin, 400);
  }

  const result = await env.DB.prepare(`
    DELETE FROM dictionary_words
    WHERE id = ?
      AND dictionary_id = ?
      AND owner_token_hash = ?
  `).bind(wordId, dictionaryId, ownerTokenHash).run();

  await env.DB.prepare(`
    UPDATE dictionaries
    SET updated_at = ?
    WHERE id = ? AND owner_token_hash = ?
  `).bind(new Date().toISOString(), dictionaryId, ownerTokenHash).run();

  return jsonResponse({
    ok: true,
    deleted: result.meta?.changes || 0
  }, origin);
}

function rowToWord(row) {
  return {
    id: row.id,
    word: row.word,
    transcription: row.transcription || "—",
    translation: row.translation || "перевод позже",
    partOfSpeech: row.part_of_speech || "",
    meta: parseStoredMeta(row.meta),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function parseStoredMeta(value) {
  if (!value) return {};

  if (typeof value === "object") return value;

  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeMetaForStorage(value) {
  if (value === undefined || value === null || value === "") {
    return "{}";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "{}";

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return JSON.stringify(parsed);
      }
    } catch {}

    return JSON.stringify({ value: trimmed });
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return JSON.stringify(value);
  }

  return "{}";
}



// ===== D1 INBOX =====

const INBOX_ORDER_STEP = 1024;
const INBOX_ENTITY_ITEM = "item";
const INBOX_ENTITY_FOLDER = "folder";

function normalizeInboxContentType(value) {
  const clean = String(value || "").trim().toLowerCase();

  if (["source", "original", "оригинал"].includes(clean)) return "source";
  if (["translation", "translated", "перевод"].includes(clean)) return "translation";
  if (["both", "source_translation", "original_translation", "оригинал_перевод"].includes(clean)) return "both";

  return "both";
}

function normalizeInboxEntityType(value) {
  const clean = String(value || "").trim().toLowerCase();

  if (["item", "file", "record", "entry"].includes(clean)) return INBOX_ENTITY_ITEM;
  if (["folder", "directory"].includes(clean)) return INBOX_ENTITY_FOLDER;

  return "";
}

function normalizeInboxFolderId(value) {
  const clean = String(value ?? "").trim();
  const lower = clean.toLowerCase();

  if (!clean || ["null", "undefined", "none", "root", "корень", "без папки"].includes(lower)) {
    return "";
  }

  return clean;
}

function inboxParentDbValue(value) {
  return normalizeInboxFolderId(value) || null;
}

function inboxParentKey(value) {
  return normalizeInboxFolderId(value) || "__root__";
}

function inboxEntityKey(type, id) {
  return `${normalizeInboxEntityType(type)}:${String(id || "").trim()}`;
}

function normalizeInboxPosition(value) {
  if (value === null || value === undefined || value === "") return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function rowToInboxItem(row, position = null) {
  const normalizedPosition = normalizeInboxPosition(
    position === null || position === undefined ? row?.position : position
  );

  return {
    id: row.id,
    title: row.title || "Без названия",
    contentType: row.content_type || "both",
    content_type: row.content_type || "both",
    sourceText: row.source_text || "",
    source_text: row.source_text || "",
    translatedText: row.translated_text || "",
    translated_text: row.translated_text || "",
    savedText: row.saved_text || "",
    saved_text: row.saved_text || "",
    folderId: row.folder_id || "",
    folder_id: row.folder_id || "",
    position: normalizedPosition,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at
  };
}

function rowToInboxFolder(row, position = null) {
  const parentFolderId = normalizeInboxFolderId(row.parent_folder_id || "");
  const normalizedPosition = normalizeInboxPosition(
    position === null || position === undefined ? row?.position : position
  );

  return {
    id: row.id,
    title: row.title || "Без названия",
    description: row.description || "",
    parentFolderId,
    parent_folder_id: parentFolderId,
    position: normalizedPosition,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at
  };
}

function rowToInboxOrder(row) {
  const parentFolderId = normalizeInboxFolderId(row.parent_folder_id || "");
  const entityType = normalizeInboxEntityType(row.entity_type);

  return {
    id: row.id,
    ownerTokenHash: row.owner_token_hash,
    owner_token_hash: row.owner_token_hash,
    parentFolderId,
    parent_folder_id: parentFolderId,
    entityType,
    entity_type: entityType,
    entityId: row.entity_id,
    entity_id: row.entity_id,
    position: normalizeInboxPosition(row.position) ?? 0
  };
}

function buildSavedInboxText(contentType, sourceText, translatedText, providedSavedText = "") {
  const saved = String(providedSavedText || "").trim();

  if (saved) return saved;

  const source = String(sourceText || "").trim();
  const translated = String(translatedText || "").trim();

  if (contentType === "source") return source;
  if (contentType === "translation") return translated;

  if (source && translated) {
    return `${source}\n\n${translated}`.trim();
  }

  return source || translated;
}

async function runInboxStatements(env, statements) {
  const cleanStatements = (statements || []).filter(Boolean);

  if (!cleanStatements.length) return [];

  if (typeof env.DB.batch === "function") {
    return await env.DB.batch(cleanStatements);
  }

  const results = [];
  for (const statement of cleanStatements) {
    results.push(await statement.run());
  }

  return results;
}

function chunkInboxValues(values, chunkSize = 80) {
  const chunks = [];

  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }

  return chunks;
}

async function getInboxFolder(env, ownerTokenHash, folderId) {
  const normalizedFolderId = normalizeInboxFolderId(folderId);

  if (!normalizedFolderId) return null;

  return await env.DB.prepare(`
    SELECT
      id,
      title,
      description,
      parent_folder_id,
      created_at,
      updated_at
    FROM inbox_folders
    WHERE id = ? AND owner_token_hash = ?
    LIMIT 1
  `).bind(normalizedFolderId, ownerTokenHash).first();
}

async function requireInboxParentFolder(env, origin, ownerTokenHash, folderId) {
  const normalizedFolderId = normalizeInboxFolderId(folderId);

  if (!normalizedFolderId) {
    return { folderId: "", folder: null, response: null };
  }

  const folder = await getInboxFolder(env, ownerTokenHash, normalizedFolderId);

  if (!folder) {
    return {
      folderId: normalizedFolderId,
      folder: null,
      response: jsonResponse({ ok: false, error: "Inbox folder not found" }, origin, 404)
    };
  }

  return { folderId: normalizedFolderId, folder, response: null };
}

async function getNextInboxPosition(env, ownerTokenHash, parentFolderId) {
  const parentDbValue = inboxParentDbValue(parentFolderId);
  const row = await env.DB.prepare(`
    SELECT MAX(position) AS max_position
    FROM inbox_tree_order
    WHERE owner_token_hash = ?
      AND parent_folder_id IS ?
  `).bind(ownerTokenHash, parentDbValue).first();

  const maxPosition = normalizeInboxPosition(row?.max_position);
  return maxPosition === null ? INBOX_ORDER_STEP : maxPosition + INBOX_ORDER_STEP;
}

function prepareDeleteInboxOrderRows(env, ownerTokenHash, entityType, entityIds) {
  const normalizedType = normalizeInboxEntityType(entityType);
  const ids = Array.from(new Set((entityIds || [])
    .map(id => String(id || "").trim())
    .filter(Boolean)));

  if (!normalizedType || !ids.length) return [];

  return chunkInboxValues(ids).map(chunk => {
    const placeholders = chunk.map(() => "?").join(", ");

    return env.DB.prepare(`
      DELETE FROM inbox_tree_order
      WHERE owner_token_hash = ?
        AND entity_type = ?
        AND entity_id IN (${placeholders})
    `).bind(ownerTokenHash, normalizedType, ...chunk);
  });
}

function prepareInsertInboxOrderRow(env, ownerTokenHash, parentFolderId, entityType, entityId, position) {
  return env.DB.prepare(`
    INSERT INTO inbox_tree_order (
      id,
      owner_token_hash,
      parent_folder_id,
      entity_type,
      entity_id,
      position
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    uid("inbox_order"),
    ownerTokenHash,
    inboxParentDbValue(parentFolderId),
    normalizeInboxEntityType(entityType),
    String(entityId || "").trim(),
    Number(position)
  );
}

async function getInboxOrderRow(env, ownerTokenHash, entityType, entityId) {
  const normalizedType = normalizeInboxEntityType(entityType);
  const normalizedId = String(entityId || "").trim();

  if (!normalizedType || !normalizedId) return null;

  return await env.DB.prepare(`
    SELECT
      id,
      owner_token_hash,
      parent_folder_id,
      entity_type,
      entity_id,
      position
    FROM inbox_tree_order
    WHERE owner_token_hash = ?
      AND entity_type = ?
      AND entity_id = ?
    ORDER BY position ASC, id ASC
    LIMIT 1
  `).bind(ownerTokenHash, normalizedType, normalizedId).first();
}

async function syncInboxTreeOrder(env, ownerTokenHash) {
  const [foldersResult, itemsResult, orderResult] = await Promise.all([
    env.DB.prepare(`
      SELECT id, parent_folder_id, created_at, updated_at
      FROM inbox_folders
      WHERE owner_token_hash = ?
    `).bind(ownerTokenHash).all(),
    env.DB.prepare(`
      SELECT id, folder_id, created_at, updated_at
      FROM inbox_items
      WHERE owner_token_hash = ?
    `).bind(ownerTokenHash).all(),
    env.DB.prepare(`
      SELECT
        id,
        owner_token_hash,
        parent_folder_id,
        entity_type,
        entity_id,
        position
      FROM inbox_tree_order
      WHERE owner_token_hash = ?
      ORDER BY position ASC, id ASC
    `).bind(ownerTokenHash).all()
  ]);

  const folders = foldersResult.results || [];
  const items = itemsResult.results || [];
  const orderRows = orderResult.results || [];
  const entities = new Map();

  for (const folder of folders) {
    entities.set(inboxEntityKey(INBOX_ENTITY_FOLDER, folder.id), {
      type: INBOX_ENTITY_FOLDER,
      id: folder.id,
      parentFolderId: normalizeInboxFolderId(folder.parent_folder_id || ""),
      createdAt: folder.created_at || folder.updated_at || ""
    });
  }

  for (const item of items) {
    entities.set(inboxEntityKey(INBOX_ENTITY_ITEM, item.id), {
      type: INBOX_ENTITY_ITEM,
      id: item.id,
      parentFolderId: normalizeInboxFolderId(item.folder_id || ""),
      createdAt: item.created_at || item.updated_at || ""
    });
  }

  const groupedRows = new Map();
  const statements = [];
  const acceptedRows = new Map();
  const maxByParent = new Map();

  for (const row of orderRows) {
    const type = normalizeInboxEntityType(row.entity_type);
    const key = inboxEntityKey(type, row.entity_id);

    if (!type || !entities.has(key)) {
      statements.push(
        env.DB.prepare(`
          DELETE FROM inbox_tree_order
          WHERE id = ? AND owner_token_hash = ?
        `).bind(row.id, ownerTokenHash)
      );
      continue;
    }

    if (!groupedRows.has(key)) groupedRows.set(key, []);
    groupedRows.get(key).push(row);
  }

  for (const [key, entity] of entities.entries()) {
    const rows = groupedRows.get(key) || [];
    const expectedParent = entity.parentFolderId;
    let canonical = rows.shift() || null;

    for (const duplicate of rows) {
      statements.push(
        env.DB.prepare(`
          DELETE FROM inbox_tree_order
          WHERE id = ? AND owner_token_hash = ?
        `).bind(duplicate.id, ownerTokenHash)
      );
    }

    if (canonical) {
      const canonicalParent = normalizeInboxFolderId(canonical.parent_folder_id || "");
      const canonicalPosition = normalizeInboxPosition(canonical.position);

      if (canonicalParent === expectedParent && canonicalPosition !== null) {
        acceptedRows.set(key, {
          ...canonical,
          entity_type: entity.type,
          entity_id: entity.id,
          parent_folder_id: inboxParentDbValue(expectedParent),
          position: canonicalPosition
        });

        const parentKey = inboxParentKey(expectedParent);
        maxByParent.set(parentKey, Math.max(maxByParent.get(parentKey) || 0, canonicalPosition));
      } else {
        statements.push(
          env.DB.prepare(`
            DELETE FROM inbox_tree_order
            WHERE id = ? AND owner_token_hash = ?
          `).bind(canonical.id, ownerTokenHash)
        );
        canonical = null;
      }
    }
  }

  const missingEntities = Array.from(entities.entries())
    .filter(([key]) => !acceptedRows.has(key))
    .map(([, entity]) => entity)
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

  for (const entity of missingEntities) {
    const parentKey = inboxParentKey(entity.parentFolderId);
    const nextPosition = (maxByParent.get(parentKey) || 0) + INBOX_ORDER_STEP;
    maxByParent.set(parentKey, nextPosition);

    statements.push(
      prepareInsertInboxOrderRow(
        env,
        ownerTokenHash,
        entity.parentFolderId,
        entity.type,
        entity.id,
        nextPosition
      )
    );
  }

  await runInboxStatements(env, statements);

  return {
    inserted: missingEntities.length,
    cleaned: Math.max(0, statements.length - missingEntities.length)
  };
}

function buildInboxTree(folders, items, orderRows) {
  const foldersById = new Map(folders.map(folder => [folder.id, folder]));
  const itemsById = new Map(items.map(item => [item.id, item]));
  const childrenByParent = new Map();

  for (const order of orderRows) {
    const parentKey = inboxParentKey(order.parentFolderId || order.parent_folder_id || "");
    if (!childrenByParent.has(parentKey)) childrenByParent.set(parentKey, []);
    childrenByParent.get(parentKey).push(order);
  }

  for (const entries of childrenByParent.values()) {
    entries.sort((a, b) => {
      const positionDiff = Number(a.position || 0) - Number(b.position || 0);
      if (positionDiff) return positionDiff;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
  }

  const buildLevel = (parentFolderId, ancestors = new Set()) => {
    const entries = childrenByParent.get(inboxParentKey(parentFolderId)) || [];
    const result = [];

    for (const order of entries) {
      const type = normalizeInboxEntityType(order.entityType || order.entity_type);
      const entityId = String(order.entityId || order.entity_id || "").trim();

      if (type === INBOX_ENTITY_ITEM) {
        const item = itemsById.get(entityId);
        if (!item) continue;

        result.push({
          type: INBOX_ENTITY_ITEM,
          entityType: INBOX_ENTITY_ITEM,
          entityId,
          position: order.position,
          item
        });
        continue;
      }

      if (type === INBOX_ENTITY_FOLDER) {
        const folder = foldersById.get(entityId);
        if (!folder || ancestors.has(entityId)) continue;

        const nextAncestors = new Set(ancestors);
        nextAncestors.add(entityId);

        result.push({
          type: INBOX_ENTITY_FOLDER,
          entityType: INBOX_ENTITY_FOLDER,
          entityId,
          position: order.position,
          folder,
          children: buildLevel(entityId, nextAncestors)
        });
      }
    }

    return result;
  };

  return buildLevel("");
}

async function handleGetInboxItems(env, origin, ownerTokenHash) {
  const dbError = requireDb(env, origin);
  if (dbError) return dbError;

  await syncInboxTreeOrder(env, ownerTokenHash);

  const [foldersResult, itemsResult, orderResult] = await Promise.all([
    env.DB.prepare(`
      SELECT
        id,
        title,
        description,
        parent_folder_id,
        created_at,
        updated_at
      FROM inbox_folders
      WHERE owner_token_hash = ?
      ORDER BY updated_at DESC, created_at DESC
    `).bind(ownerTokenHash).all(),
    env.DB.prepare(`
      SELECT
        id,
        title,
        content_type,
        source_text,
        translated_text,
        saved_text,
        folder_id,
        created_at,
        updated_at
      FROM inbox_items
      WHERE owner_token_hash = ?
      ORDER BY updated_at DESC, created_at DESC
    `).bind(ownerTokenHash).all(),
    env.DB.prepare(`
      SELECT
        id,
        owner_token_hash,
        parent_folder_id,
        entity_type,
        entity_id,
        position
      FROM inbox_tree_order
      WHERE owner_token_hash = ?
      ORDER BY
        CASE WHEN parent_folder_id IS NULL THEN 0 ELSE 1 END,
        parent_folder_id ASC,
        position ASC,
        id ASC
    `).bind(ownerTokenHash).all()
  ]);

  const orderRows = (orderResult.results || []).map(rowToInboxOrder);
  const orderByEntity = new Map(orderRows.map(order => [
    inboxEntityKey(order.entityType, order.entityId),
    order
  ]));

  const folders = (foldersResult.results || []).map(row => {
    const order = orderByEntity.get(inboxEntityKey(INBOX_ENTITY_FOLDER, row.id));
    return rowToInboxFolder(row, order?.position ?? null);
  });

  const items = (itemsResult.results || []).map(row => {
    const order = orderByEntity.get(inboxEntityKey(INBOX_ENTITY_ITEM, row.id));
    return rowToInboxItem(row, order?.position ?? null);
  });

  const tree = buildInboxTree(folders, items, orderRows);

  return jsonResponse({
    ok: true,
    folders,
    inboxFolders: folders,
    inbox: items,
    items,
    treeOrder: orderRows,
    inboxTreeOrder: orderRows,
    rootEntries: tree,
    tree
  }, origin);
}

async function handleCreateInboxItem(request, env, origin, ownerTokenHash) {
  const dbError = requireDb(env, origin);
  if (dbError) return dbError;

  await syncInboxTreeOrder(env, ownerTokenHash);

  const body = await readJsonBody(request);
  const now = new Date().toISOString();
  const id = String(body.id || "").trim() || uid("inbox");
  const title = String(body.title || "").trim() || formatInboxDefaultTitle(now);
  const contentType = normalizeInboxContentType(body.contentType || body.content_type);
  const sourceText = String(body.sourceText ?? body.source_text ?? "");
  const translatedText = String(body.translatedText ?? body.translated_text ?? "");
  const savedText = buildSavedInboxText(contentType, sourceText, translatedText, body.savedText ?? body.saved_text ?? "");
  const parentCheck = await requireInboxParentFolder(
    env,
    origin,
    ownerTokenHash,
    body.folderId ?? body.folder_id ?? ""
  );

  if (parentCheck.response) return parentCheck.response;

  if (!savedText.trim()) {
    return jsonResponse({
      ok: false,
      error: "Saved text is required"
    }, origin, 400);
  }

  const position = await getNextInboxPosition(env, ownerTokenHash, parentCheck.folderId);

  await runInboxStatements(env, [
    env.DB.prepare(`
      INSERT INTO inbox_items (
        id,
        owner_token_hash,
        title,
        content_type,
        source_text,
        translated_text,
        saved_text,
        folder_id,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      ownerTokenHash,
      title,
      contentType,
      sourceText,
      translatedText,
      savedText,
      inboxParentDbValue(parentCheck.folderId),
      now,
      now
    ),
    ...prepareDeleteInboxOrderRows(env, ownerTokenHash, INBOX_ENTITY_ITEM, [id]),
    prepareInsertInboxOrderRow(
      env,
      ownerTokenHash,
      parentCheck.folderId,
      INBOX_ENTITY_ITEM,
      id,
      position
    )
  ]);

  const saved = await env.DB.prepare(`
    SELECT
      id,
      title,
      content_type,
      source_text,
      translated_text,
      saved_text,
      folder_id,
      created_at,
      updated_at
    FROM inbox_items
    WHERE id = ? AND owner_token_hash = ?
    LIMIT 1
  `).bind(id, ownerTokenHash).first();

  const item = rowToInboxItem(saved, position);

  return jsonResponse({
    ok: true,
    item,
    inboxItem: item
  }, origin);
}

async function handleUpdateInboxItem(request, env, origin, ownerTokenHash, inboxItemId) {
  const dbError = requireDb(env, origin);
  if (dbError) return dbError;

  await syncInboxTreeOrder(env, ownerTokenHash);

  if (!inboxItemId) {
    return jsonResponse({ ok: false, error: "Inbox item id is required" }, origin, 400);
  }

  const existing = await env.DB.prepare(`
    SELECT
      id,
      title,
      content_type,
      source_text,
      translated_text,
      saved_text,
      folder_id,
      created_at,
      updated_at
    FROM inbox_items
    WHERE id = ? AND owner_token_hash = ?
    LIMIT 1
  `).bind(inboxItemId, ownerTokenHash).first();

  if (!existing) {
    return jsonResponse({ ok: false, error: "Inbox item not found" }, origin, 404);
  }

  const body = await readJsonBody(request);
  const now = new Date().toISOString();
  const title = body.title === undefined
    ? existing.title
    : (String(body.title || "").trim() || existing.title || formatInboxDefaultTitle(now));
  const contentType = body.contentType === undefined && body.content_type === undefined
    ? existing.content_type
    : normalizeInboxContentType(body.contentType || body.content_type);
  const sourceText = body.sourceText === undefined && body.source_text === undefined
    ? (existing.source_text || "")
    : String(body.sourceText ?? body.source_text ?? "");
  const translatedText = body.translatedText === undefined && body.translated_text === undefined
    ? (existing.translated_text || "")
    : String(body.translatedText ?? body.translated_text ?? "");
  const requestedFolderId = body.folderId === undefined && body.folder_id === undefined
    ? normalizeInboxFolderId(existing.folder_id || "")
    : normalizeInboxFolderId(body.folderId ?? body.folder_id ?? "");
  const savedText = body.savedText === undefined && body.saved_text === undefined
    ? buildSavedInboxText(contentType, sourceText, translatedText, existing.saved_text || "")
    : buildSavedInboxText(contentType, sourceText, translatedText, body.savedText ?? body.saved_text ?? "");

  const parentCheck = await requireInboxParentFolder(env, origin, ownerTokenHash, requestedFolderId);
  if (parentCheck.response) return parentCheck.response;

  if (!savedText.trim()) {
    return jsonResponse({
      ok: false,
      error: "Saved text is required"
    }, origin, 400);
  }

  const currentFolderId = normalizeInboxFolderId(existing.folder_id || "");
  const currentOrder = await getInboxOrderRow(env, ownerTokenHash, INBOX_ENTITY_ITEM, inboxItemId);
  const folderChanged = currentFolderId !== parentCheck.folderId;
  const currentPosition = normalizeInboxPosition(currentOrder?.position);
  const position = folderChanged || currentPosition === null
    ? await getNextInboxPosition(env, ownerTokenHash, parentCheck.folderId)
    : currentPosition;

  await runInboxStatements(env, [
    env.DB.prepare(`
      UPDATE inbox_items
      SET
        title = ?,
        content_type = ?,
        source_text = ?,
        translated_text = ?,
        saved_text = ?,
        folder_id = ?,
        updated_at = ?
      WHERE id = ? AND owner_token_hash = ?
    `).bind(
      title,
      contentType,
      sourceText,
      translatedText,
      savedText,
      inboxParentDbValue(parentCheck.folderId),
      now,
      inboxItemId,
      ownerTokenHash
    ),
    ...prepareDeleteInboxOrderRows(env, ownerTokenHash, INBOX_ENTITY_ITEM, [inboxItemId]),
    prepareInsertInboxOrderRow(
      env,
      ownerTokenHash,
      parentCheck.folderId,
      INBOX_ENTITY_ITEM,
      inboxItemId,
      position
    )
  ]);

  const saved = await env.DB.prepare(`
    SELECT
      id,
      title,
      content_type,
      source_text,
      translated_text,
      saved_text,
      folder_id,
      created_at,
      updated_at
    FROM inbox_items
    WHERE id = ? AND owner_token_hash = ?
    LIMIT 1
  `).bind(inboxItemId, ownerTokenHash).first();

  const item = rowToInboxItem(saved, position);

  return jsonResponse({
    ok: true,
    item,
    inboxItem: item
  }, origin);
}

async function handleDeleteInboxItem(env, origin, ownerTokenHash, inboxItemId) {
  const dbError = requireDb(env, origin);
  if (dbError) return dbError;

  if (!inboxItemId) {
    return jsonResponse({ ok: false, error: "Inbox item id is required" }, origin, 400);
  }

  const existing = await env.DB.prepare(`
    SELECT id
    FROM inbox_items
    WHERE id = ? AND owner_token_hash = ?
    LIMIT 1
  `).bind(inboxItemId, ownerTokenHash).first();

  if (!existing) {
    return jsonResponse({ ok: true, deleted: 0 }, origin);
  }

  await runInboxStatements(env, [
    ...prepareDeleteInboxOrderRows(env, ownerTokenHash, INBOX_ENTITY_ITEM, [inboxItemId]),
    env.DB.prepare(`
      DELETE FROM inbox_items
      WHERE id = ? AND owner_token_hash = ?
    `).bind(inboxItemId, ownerTokenHash)
  ]);

  return jsonResponse({
    ok: true,
    deleted: 1
  }, origin);
}

async function handleMergeInboxItems(request, env, origin, ownerTokenHash) {
  const dbError = requireDb(env, origin);
  if (dbError) return dbError;

  const body = await readJsonBody(request);
  const rawIds = Array.isArray(body.ids)
    ? body.ids
    : (Array.isArray(body.itemIds) ? body.itemIds : []);

  const ids = rawIds
    .map(id => String(id || "").trim())
    .filter(Boolean);

  const uniqueIds = Array.from(new Set(ids));

  if (uniqueIds.length < 2) {
    return jsonResponse({
      ok: false,
      error: "At least two inbox item ids are required"
    }, origin, 400);
  }

  await syncInboxTreeOrder(env, ownerTokenHash);

  const placeholders = uniqueIds.map(() => "?").join(", ");
  const rowsResult = await env.DB.prepare(`
    SELECT
      id,
      title,
      content_type,
      source_text,
      translated_text,
      saved_text,
      folder_id,
      created_at,
      updated_at
    FROM inbox_items
    WHERE owner_token_hash = ?
      AND id IN (${placeholders})
  `).bind(ownerTokenHash, ...uniqueIds).all();

  const rows = rowsResult.results || [];
  const byId = new Map(rows.map(row => [row.id, row]));
  const orderedRows = uniqueIds
    .map(id => byId.get(id))
    .filter(Boolean);

  if (orderedRows.length !== uniqueIds.length) {
    return jsonResponse({
      ok: false,
      error: "One or more inbox items were not found"
    }, origin, 404);
  }

  const now = new Date().toISOString();
  let id = String(body.id || "").trim() || uid("inbox");
  if (uniqueIds.includes(id)) id = uid("inbox");

  const title = String(body.title || "").trim() || formatInboxDefaultTitle(now);
  const contentType = "both";
  const requestedFolderId = normalizeInboxFolderId(body.folderId ?? body.folder_id ?? "");
  const sourceFolderIds = Array.from(new Set(orderedRows.map(row => normalizeInboxFolderId(row.folder_id || ""))));
  const folderId = requestedFolderId || (sourceFolderIds.length === 1 ? sourceFolderIds[0] : "");
  const parentCheck = await requireInboxParentFolder(env, origin, ownerTokenHash, folderId);

  if (parentCheck.response) return parentCheck.response;

  const sections = orderedRows
    .map((row, index) => buildMergedInboxSection(row, index + 1))
    .filter(Boolean);
  const savedText = sections.join("\n\n").trim();

  if (!savedText) {
    return jsonResponse({
      ok: false,
      error: "Merged text is empty"
    }, origin, 400);
  }

  const orderRowsResult = await env.DB.prepare(`
    SELECT entity_id, parent_folder_id, position
    FROM inbox_tree_order
    WHERE owner_token_hash = ?
      AND entity_type = ?
      AND entity_id IN (${placeholders})
  `).bind(ownerTokenHash, INBOX_ENTITY_ITEM, ...uniqueIds).all();

  const selectedOrderRows = orderRowsResult.results || [];
  const allSameParent = selectedOrderRows.length === uniqueIds.length && selectedOrderRows.every(row =>
    normalizeInboxFolderId(row.parent_folder_id || "") === parentCheck.folderId
  );
  const selectedPositions = selectedOrderRows
    .map(row => normalizeInboxPosition(row.position))
    .filter(position => position !== null);
  const position = allSameParent && selectedPositions.length
    ? Math.min(...selectedPositions)
    : await getNextInboxPosition(env, ownerTokenHash, parentCheck.folderId);

  await runInboxStatements(env, [
    env.DB.prepare(`
      INSERT INTO inbox_items (
        id,
        owner_token_hash,
        title,
        content_type,
        source_text,
        translated_text,
        saved_text,
        folder_id,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      ownerTokenHash,
      title,
      contentType,
      "",
      "",
      savedText,
      inboxParentDbValue(parentCheck.folderId),
      now,
      now
    ),
    ...prepareDeleteInboxOrderRows(env, ownerTokenHash, INBOX_ENTITY_ITEM, uniqueIds),
    env.DB.prepare(`
      DELETE FROM inbox_items
      WHERE owner_token_hash = ?
        AND id IN (${placeholders})
    `).bind(ownerTokenHash, ...uniqueIds),
    ...prepareDeleteInboxOrderRows(env, ownerTokenHash, INBOX_ENTITY_ITEM, [id]),
    prepareInsertInboxOrderRow(
      env,
      ownerTokenHash,
      parentCheck.folderId,
      INBOX_ENTITY_ITEM,
      id,
      position
    )
  ]);

  const saved = await env.DB.prepare(`
    SELECT
      id,
      title,
      content_type,
      source_text,
      translated_text,
      saved_text,
      folder_id,
      created_at,
      updated_at
    FROM inbox_items
    WHERE id = ? AND owner_token_hash = ?
    LIMIT 1
  `).bind(id, ownerTokenHash).first();

  const item = rowToInboxItem(saved, position);

  return jsonResponse({
    ok: true,
    merged: true,
    deleted: uniqueIds.length,
    item,
    inboxItem: item
  }, origin);
}

async function handleCreateInboxFolder(request, env, origin, ownerTokenHash) {
  const dbError = requireDb(env, origin);
  if (dbError) return dbError;

  await syncInboxTreeOrder(env, ownerTokenHash);

  const body = await readJsonBody(request);
  const now = new Date().toISOString();
  const id = String(body.id || "").trim() || uid("inbox_folder");
  const title = String(body.title || body.name || "").trim() || "Новая папка";
  const description = String(body.description ?? body.note ?? "");
  const requestedParentId = body.parentFolderId ?? body.parent_folder_id ?? "";
  const parentCheck = await requireInboxParentFolder(env, origin, ownerTokenHash, requestedParentId);

  if (parentCheck.response) return parentCheck.response;

  const rawItemIds = Array.isArray(body.ids)
    ? body.ids
    : (Array.isArray(body.itemIds) ? body.itemIds : []);
  const itemIds = Array.from(new Set(rawItemIds
    .map(itemId => String(itemId || "").trim())
    .filter(Boolean)));
  const rawFolderIds = Array.isArray(body.folderIds)
    ? body.folderIds
    : (Array.isArray(body.childFolderIds) ? body.childFolderIds : []);
  const folderIds = Array.from(new Set(rawFolderIds
    .map(folderId => String(folderId || "").trim())
    .filter(folderId => folderId && folderId !== id)));

  const validItemIds = [];
  const validFolderIds = [];

  if (itemIds.length) {
    const placeholders = itemIds.map(() => "?").join(", ");
    const result = await env.DB.prepare(`
      SELECT id
      FROM inbox_items
      WHERE owner_token_hash = ?
        AND id IN (${placeholders})
    `).bind(ownerTokenHash, ...itemIds).all();
    validItemIds.push(...(result.results || []).map(row => row.id));
  }

  if (folderIds.length) {
    const placeholders = folderIds.map(() => "?").join(", ");
    const result = await env.DB.prepare(`
      SELECT id
      FROM inbox_folders
      WHERE owner_token_hash = ?
        AND id IN (${placeholders})
    `).bind(ownerTokenHash, ...folderIds).all();
    validFolderIds.push(...(result.results || []).map(row => row.id));
  }

  if (validFolderIds.length && parentCheck.folderId) {
    const allFoldersResult = await env.DB.prepare(`
      SELECT id, parent_folder_id
      FROM inbox_folders
      WHERE owner_token_hash = ?
    `).bind(ownerTokenHash).all();
    const parentById = new Map((allFoldersResult.results || []).map(folder => [
      folder.id,
      normalizeInboxFolderId(folder.parent_folder_id || "")
    ]));

    for (const selectedFolderId of validFolderIds) {
      let cursor = parentCheck.folderId;
      const visited = new Set();

      while (cursor) {
        if (cursor === selectedFolderId) {
          return jsonResponse({
            ok: false,
            error: "A selected folder cannot contain the new folder's parent"
          }, origin, 409);
        }

        if (visited.has(cursor)) break;
        visited.add(cursor);
        cursor = parentById.get(cursor) || "";
      }
    }
  }

  const folderPosition = await getNextInboxPosition(env, ownerTokenHash, parentCheck.folderId);
  const statements = [
    env.DB.prepare(`
      INSERT INTO inbox_folders (
        id,
        owner_token_hash,
        title,
        description,
        parent_folder_id,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      ownerTokenHash,
      title,
      description,
      inboxParentDbValue(parentCheck.folderId),
      now,
      now
    ),
    ...prepareDeleteInboxOrderRows(env, ownerTokenHash, INBOX_ENTITY_FOLDER, [id]),
    prepareInsertInboxOrderRow(
      env,
      ownerTokenHash,
      parentCheck.folderId,
      INBOX_ENTITY_FOLDER,
      id,
      folderPosition
    )
  ];

  let childPosition = INBOX_ORDER_STEP;

  for (const itemId of validItemIds) {
    statements.push(
      env.DB.prepare(`
        UPDATE inbox_items
        SET folder_id = ?, updated_at = ?
        WHERE id = ? AND owner_token_hash = ?
      `).bind(id, now, itemId, ownerTokenHash),
      ...prepareDeleteInboxOrderRows(env, ownerTokenHash, INBOX_ENTITY_ITEM, [itemId]),
      prepareInsertInboxOrderRow(
        env,
        ownerTokenHash,
        id,
        INBOX_ENTITY_ITEM,
        itemId,
        childPosition
      )
    );
    childPosition += INBOX_ORDER_STEP;
  }

  for (const childFolderId of validFolderIds) {
    statements.push(
      env.DB.prepare(`
        UPDATE inbox_folders
        SET parent_folder_id = ?, updated_at = ?
        WHERE id = ? AND owner_token_hash = ?
      `).bind(id, now, childFolderId, ownerTokenHash),
      ...prepareDeleteInboxOrderRows(env, ownerTokenHash, INBOX_ENTITY_FOLDER, [childFolderId]),
      prepareInsertInboxOrderRow(
        env,
        ownerTokenHash,
        id,
        INBOX_ENTITY_FOLDER,
        childFolderId,
        childPosition
      )
    );
    childPosition += INBOX_ORDER_STEP;
  }

  await runInboxStatements(env, statements);

  const saved = await env.DB.prepare(`
    SELECT
      id,
      title,
      description,
      parent_folder_id,
      created_at,
      updated_at
    FROM inbox_folders
    WHERE id = ? AND owner_token_hash = ?
    LIMIT 1
  `).bind(id, ownerTokenHash).first();

  const folder = rowToInboxFolder(saved, folderPosition);

  return jsonResponse({
    ok: true,
    folder,
    inboxFolder: folder,
    moved: validItemIds.length + validFolderIds.length,
    movedItems: validItemIds.length,
    movedFolders: validFolderIds.length
  }, origin);
}

async function handleUpdateInboxFolder(request, env, origin, ownerTokenHash, folderId) {
  const dbError = requireDb(env, origin);
  if (dbError) return dbError;

  await syncInboxTreeOrder(env, ownerTokenHash);

  if (!folderId) {
    return jsonResponse({ ok: false, error: "Inbox folder id is required" }, origin, 400);
  }

  const body = await readJsonBody(request);
  const now = new Date().toISOString();
  const existing = await getInboxFolder(env, ownerTokenHash, folderId);

  if (!existing) {
    return jsonResponse({ ok: false, error: "Inbox folder not found" }, origin, 404);
  }

  const hasTitle = Object.prototype.hasOwnProperty.call(body, "title") || Object.prototype.hasOwnProperty.call(body, "name");
  const hasDescription = Object.prototype.hasOwnProperty.call(body, "description") || Object.prototype.hasOwnProperty.call(body, "note");

  if (!hasTitle && !hasDescription) {
    return jsonResponse({ ok: false, error: "Inbox folder update is empty" }, origin, 400);
  }

  const title = hasTitle
    ? String(body.title ?? body.name ?? "").trim()
    : String(existing.title || "").trim();
  const description = hasDescription
    ? String(body.description ?? body.note ?? "")
    : String(existing.description || "");

  if (!title) {
    return jsonResponse({ ok: false, error: "Inbox folder title is required" }, origin, 400);
  }

  await env.DB.prepare(`
    UPDATE inbox_folders
    SET title = ?, description = ?, updated_at = ?
    WHERE id = ? AND owner_token_hash = ?
  `).bind(title, description, now, folderId, ownerTokenHash).run();

  const saved = await getInboxFolder(env, ownerTokenHash, folderId);
  const order = await getInboxOrderRow(env, ownerTokenHash, INBOX_ENTITY_FOLDER, folderId);
  const folder = rowToInboxFolder(saved, order?.position ?? null);

  return jsonResponse({
    ok: true,
    folder,
    inboxFolder: folder
  }, origin);
}

async function handleDeleteInboxFolder(env, origin, ownerTokenHash, folderId) {
  const dbError = requireDb(env, origin);
  if (dbError) return dbError;

  const normalizedFolderId = normalizeInboxFolderId(folderId);

  if (!normalizedFolderId) {
    return jsonResponse({ ok: false, error: "Inbox folder id is required" }, origin, 400);
  }

  const foldersResult = await env.DB.prepare(`
    SELECT id, parent_folder_id
    FROM inbox_folders
    WHERE owner_token_hash = ?
  `).bind(ownerTokenHash).all();
  const allFolders = foldersResult.results || [];
  const existing = allFolders.find(folder => folder.id === normalizedFolderId);

  if (!existing) {
    return jsonResponse({ ok: false, error: "Inbox folder not found" }, origin, 404);
  }

  const childrenByParent = new Map();
  for (const folder of allFolders) {
    const parentId = normalizeInboxFolderId(folder.parent_folder_id || "");
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId).push(folder.id);
  }

  const folderIds = [];
  const seen = new Set();
  const queue = [normalizedFolderId];

  while (queue.length) {
    const currentId = queue.shift();
    if (!currentId || seen.has(currentId)) continue;

    seen.add(currentId);
    folderIds.push(currentId);

    for (const childId of childrenByParent.get(currentId) || []) {
      if (!seen.has(childId)) queue.push(childId);
    }
  }

  const itemIds = [];
  for (const chunk of chunkInboxValues(folderIds)) {
    const placeholders = chunk.map(() => "?").join(", ");
    const result = await env.DB.prepare(`
      SELECT id
      FROM inbox_items
      WHERE owner_token_hash = ?
        AND folder_id IN (${placeholders})
    `).bind(ownerTokenHash, ...chunk).all();

    itemIds.push(...(result.results || []).map(row => row.id));
  }

  const statements = [
    ...prepareDeleteInboxOrderRows(env, ownerTokenHash, INBOX_ENTITY_ITEM, itemIds),
    ...prepareDeleteInboxOrderRows(env, ownerTokenHash, INBOX_ENTITY_FOLDER, folderIds)
  ];

  for (const chunk of chunkInboxValues(folderIds)) {
    const placeholders = chunk.map(() => "?").join(", ");

    statements.push(
      env.DB.prepare(`
        DELETE FROM inbox_items
        WHERE owner_token_hash = ?
          AND folder_id IN (${placeholders})
      `).bind(ownerTokenHash, ...chunk)
    );
  }

  for (const chunk of chunkInboxValues(folderIds)) {
    const placeholders = chunk.map(() => "?").join(", ");

    statements.push(
      env.DB.prepare(`
        DELETE FROM inbox_folders
        WHERE owner_token_hash = ?
          AND id IN (${placeholders})
      `).bind(ownerTokenHash, ...chunk)
    );
  }

  await runInboxStatements(env, statements);

  return jsonResponse({
    ok: true,
    deleted: 1,
    deletedFolders: folderIds.length,
    deletedItems: itemIds.length,
    movedOut: 0
  }, origin);
}

async function handleMoveInboxItems(request, env, origin, ownerTokenHash) {
  const dbError = requireDb(env, origin);
  if (dbError) return dbError;

  await syncInboxTreeOrder(env, ownerTokenHash);

  const body = await readJsonBody(request);
  const rawIds = Array.isArray(body.ids)
    ? body.ids
    : (Array.isArray(body.itemIds) ? body.itemIds : []);
  const ids = Array.from(new Set(rawIds
    .map(id => String(id || "").trim())
    .filter(Boolean)));

  if (!ids.length) {
    return jsonResponse({ ok: false, error: "Inbox item ids are required" }, origin, 400);
  }

  const parentCheck = await requireInboxParentFolder(
    env,
    origin,
    ownerTokenHash,
    body.folderId ?? body.folder_id ?? body.parentFolderId ?? body.parent_folder_id ?? ""
  );

  if (parentCheck.response) return parentCheck.response;

  const placeholders = ids.map(() => "?").join(", ");
  const itemsResult = await env.DB.prepare(`
    SELECT id
    FROM inbox_items
    WHERE owner_token_hash = ?
      AND id IN (${placeholders})
  `).bind(ownerTokenHash, ...ids).all();
  const validSet = new Set((itemsResult.results || []).map(row => row.id));
  const validIds = ids.filter(id => validSet.has(id));
  const now = new Date().toISOString();
  let position = await getNextInboxPosition(env, ownerTokenHash, parentCheck.folderId);
  const statements = [];

  for (const itemId of validIds) {
    statements.push(
      env.DB.prepare(`
        UPDATE inbox_items
        SET folder_id = ?, updated_at = ?
        WHERE id = ? AND owner_token_hash = ?
      `).bind(inboxParentDbValue(parentCheck.folderId), now, itemId, ownerTokenHash),
      ...prepareDeleteInboxOrderRows(env, ownerTokenHash, INBOX_ENTITY_ITEM, [itemId]),
      prepareInsertInboxOrderRow(
        env,
        ownerTokenHash,
        parentCheck.folderId,
        INBOX_ENTITY_ITEM,
        itemId,
        position
      )
    );

    position += INBOX_ORDER_STEP;
  }

  await runInboxStatements(env, statements);

  return jsonResponse({
    ok: true,
    folderId: parentCheck.folderId,
    folder_id: parentCheck.folderId,
    moved: validIds.length,
    missing: ids.filter(id => !validSet.has(id))
  }, origin);
}

async function handleMoveInboxFolder(request, env, origin, ownerTokenHash) {
  const dbError = requireDb(env, origin);
  if (dbError) return dbError;

  await syncInboxTreeOrder(env, ownerTokenHash);

  const body = await readJsonBody(request);
  const folderId = normalizeInboxFolderId(body.folderId ?? body.folder_id ?? body.id ?? "");
  const parentFolderId = normalizeInboxFolderId(body.parentFolderId ?? body.parent_folder_id ?? "");

  if (!folderId) {
    return jsonResponse({ ok: false, error: "Inbox folder id is required" }, origin, 400);
  }

  if (folderId === parentFolderId) {
    return jsonResponse({ ok: false, error: "A folder cannot be moved into itself" }, origin, 400);
  }

  const foldersResult = await env.DB.prepare(`
    SELECT
      id,
      title,
      parent_folder_id,
      created_at,
      updated_at
    FROM inbox_folders
    WHERE owner_token_hash = ?
  `).bind(ownerTokenHash).all();
  const folders = foldersResult.results || [];
  const byId = new Map(folders.map(folder => [folder.id, folder]));
  const folder = byId.get(folderId);

  if (!folder) {
    return jsonResponse({ ok: false, error: "Inbox folder not found" }, origin, 404);
  }

  if (parentFolderId && !byId.has(parentFolderId)) {
    return jsonResponse({ ok: false, error: "Target inbox folder not found" }, origin, 404);
  }

  let cursor = parentFolderId;
  const visited = new Set();

  while (cursor) {
    if (cursor === folderId) {
      return jsonResponse({
        ok: false,
        error: "A folder cannot be moved into its own descendant"
      }, origin, 409);
    }

    if (visited.has(cursor)) {
      return jsonResponse({
        ok: false,
        error: "Folder tree contains a cycle"
      }, origin, 409);
    }

    visited.add(cursor);
    cursor = normalizeInboxFolderId(byId.get(cursor)?.parent_folder_id || "");
  }

  const currentParentId = normalizeInboxFolderId(folder.parent_folder_id || "");
  const currentOrder = await getInboxOrderRow(env, ownerTokenHash, INBOX_ENTITY_FOLDER, folderId);
  const currentPosition = normalizeInboxPosition(currentOrder?.position);
  const parentChanged = currentParentId !== parentFolderId;
  const position = parentChanged || currentPosition === null
    ? await getNextInboxPosition(env, ownerTokenHash, parentFolderId)
    : currentPosition;
  const now = new Date().toISOString();

  await runInboxStatements(env, [
    env.DB.prepare(`
      UPDATE inbox_folders
      SET parent_folder_id = ?, updated_at = ?
      WHERE id = ? AND owner_token_hash = ?
    `).bind(inboxParentDbValue(parentFolderId), now, folderId, ownerTokenHash),
    ...prepareDeleteInboxOrderRows(env, ownerTokenHash, INBOX_ENTITY_FOLDER, [folderId]),
    prepareInsertInboxOrderRow(
      env,
      ownerTokenHash,
      parentFolderId,
      INBOX_ENTITY_FOLDER,
      folderId,
      position
    )
  ]);

  const saved = await getInboxFolder(env, ownerTokenHash, folderId);
  const responseFolder = rowToInboxFolder(saved, position);

  return jsonResponse({
    ok: true,
    moved: parentChanged ? 1 : 0,
    folderId,
    folder_id: folderId,
    parentFolderId,
    parent_folder_id: parentFolderId,
    folder: responseFolder,
    inboxFolder: responseFolder
  }, origin);
}

async function handleReorderInboxEntity(request, env, origin, ownerTokenHash) {
  const dbError = requireDb(env, origin);
  if (dbError) return dbError;

  const body = await readJsonBody(request);
  const entityType = normalizeInboxEntityType(body.type || body.entityType || body.entity_type);
  const entityId = String(body.id || body.entityId || body.entity_id || "").trim();

  if (!entityType || !entityId) {
    return jsonResponse({
      ok: false,
      error: "Entity type and id are required"
    }, origin, 400);
  }

  await syncInboxTreeOrder(env, ownerTokenHash);

  const current = await getInboxOrderRow(env, ownerTokenHash, entityType, entityId);

  if (!current) {
    return jsonResponse({ ok: false, error: "Inbox entity not found" }, origin, 404);
  }

  const parentFolderId = normalizeInboxFolderId(current.parent_folder_id || "");
  const siblingsResult = await env.DB.prepare(`
    SELECT
      id,
      owner_token_hash,
      parent_folder_id,
      entity_type,
      entity_id,
      position
    FROM inbox_tree_order
    WHERE owner_token_hash = ?
      AND parent_folder_id IS ?
    ORDER BY position ASC, id ASC
  `).bind(ownerTokenHash, inboxParentDbValue(parentFolderId)).all();
  const siblings = siblingsResult.results || [];
  const currentIndex = siblings.findIndex(row =>
    normalizeInboxEntityType(row.entity_type) === entityType && row.entity_id === entityId
  );

  if (currentIndex < 0) {
    return jsonResponse({ ok: false, error: "Inbox entity order row not found" }, origin, 404);
  }

  let targetIndex = Number.isInteger(Number(body.targetIndex ?? body.target_index))
    ? Number(body.targetIndex ?? body.target_index)
    : currentIndex;
  const direction = String(body.direction || "").trim().toLowerCase();

  if (direction === "up") targetIndex = currentIndex - 1;
  if (direction === "down") targetIndex = currentIndex + 1;
  if (direction === "top" || direction === "first") targetIndex = 0;
  if (direction === "bottom" || direction === "last") targetIndex = siblings.length - 1;

  targetIndex = Math.max(0, Math.min(siblings.length - 1, targetIndex));

  if (targetIndex !== currentIndex) {
    const [movedRow] = siblings.splice(currentIndex, 1);
    siblings.splice(targetIndex, 0, movedRow);
  }

  const statements = siblings.map((row, index) =>
    env.DB.prepare(`
      UPDATE inbox_tree_order
      SET position = ?, parent_folder_id = ?
      WHERE id = ? AND owner_token_hash = ?
    `).bind(
      (index + 1) * INBOX_ORDER_STEP,
      inboxParentDbValue(parentFolderId),
      row.id,
      ownerTokenHash
    )
  );

  await runInboxStatements(env, statements);

  const reordered = siblings.map((row, index) => rowToInboxOrder({
    ...row,
    parent_folder_id: inboxParentDbValue(parentFolderId),
    position: (index + 1) * INBOX_ORDER_STEP
  }));

  return jsonResponse({
    ok: true,
    type: entityType,
    entityType,
    entityId,
    parentFolderId,
    parent_folder_id: parentFolderId,
    oldIndex: currentIndex,
    newIndex: targetIndex,
    siblings: reordered
  }, origin);
}

function buildMergedInboxSection(row, number) {
  const title = String(row?.title || "").trim() || `Запись ${number}`;
  const savedText = String(row?.saved_text || "").trim();
  const sourceText = String(row?.source_text || "").trim();
  const translatedText = String(row?.translated_text || "").trim();
  const contentType = normalizeInboxContentType(row?.content_type);

  let body = savedText;

  if (!body) {
    body = buildSavedInboxText(contentType, sourceText, translatedText, "");
  }

  body = String(body || "").trim();

  if (!body) return "";

  return `===== ${title} =====\n\n${body}`;
}

function formatInboxDefaultTitle(isoString) {
  const date = new Date(isoString || Date.now());
  const pad = value => String(value).padStart(2, "0");

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ===== PUBLIC DICTIONARY LINKS =====

async function handleCreateDictionaryPublicLink(request, env, origin, ownerTokenHash, dictionaryId, url) {
  const dbError = requireDb(env, origin);
  if (dbError) return dbError;

  if (!dictionaryId) {
    return jsonResponse({ ok: false, error: "Dictionary id is required" }, origin, 400);
  }

  const dictionary = await env.DB.prepare(`
    SELECT id, title
    FROM dictionaries
    WHERE id = ? AND owner_token_hash = ?
    LIMIT 1
  `).bind(dictionaryId, ownerTokenHash).first();

  if (!dictionary) {
    return jsonResponse({ ok: false, error: "Dictionary not found" }, origin, 404);
  }

  const now = new Date().toISOString();

  const existing = await env.DB.prepare(`
    SELECT id, share_id, is_active, created_at, updated_at
    FROM public_dictionary_links
    WHERE dictionary_id = ? AND owner_token_hash = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(dictionaryId, ownerTokenHash).first();

  let linkId = "";
  let shareId = "";

  if (existing && existing.share_id) {
    linkId = existing.id;
    shareId = existing.share_id;

    if (Number(existing.is_active) !== 1) {
      await env.DB.prepare(`
        UPDATE public_dictionary_links
        SET is_active = 1, updated_at = ?
        WHERE id = ? AND owner_token_hash = ?
      `).bind(now, linkId, ownerTokenHash).run();
    }
  } else {
    linkId = uid("pubdict");
    shareId = generateShareId();

    await env.DB.prepare(`
      INSERT INTO public_dictionary_links (
        id,
        owner_token_hash,
        dictionary_id,
        share_id,
        is_active,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).bind(linkId, ownerTokenHash, dictionaryId, shareId, now, now).run();
  }

  const publicApiUrl = `${url.origin}/public/dictionary/${encodeURIComponent(shareId)}`;
  const appBaseUrl = getPublicAppBaseUrl(env, origin);
  const publicAppUrl = `${appBaseUrl}?publicDictionary=${encodeURIComponent(shareId)}`;

  return jsonResponse({
    ok: true,
    publicLink: {
      id: linkId,
      dictionaryId,
      shareId,
      isActive: true,
      publicApiUrl,
      publicAppUrl,
      url: publicAppUrl
    }
  }, origin);
}

async function handleDeactivateDictionaryPublicLink(env, origin, ownerTokenHash, dictionaryId) {
  const dbError = requireDb(env, origin);
  if (dbError) return dbError;

  if (!dictionaryId) {
    return jsonResponse({ ok: false, error: "Dictionary id is required" }, origin, 400);
  }

  const now = new Date().toISOString();

  const result = await env.DB.prepare(`
    UPDATE public_dictionary_links
    SET is_active = 0, updated_at = ?
    WHERE dictionary_id = ? AND owner_token_hash = ?
  `).bind(now, dictionaryId, ownerTokenHash).run();

  return jsonResponse({
    ok: true,
    deactivated: result.meta?.changes || 0
  }, origin);
}

async function handleGetPublicDictionary(env, origin, shareId) {
  const dbError = requireDb(env, origin);
  if (dbError) return dbError;

  if (!shareId) {
    return jsonResponse({ ok: false, error: "Public link id is required" }, origin, 400);
  }

  const link = await env.DB.prepare(`
    SELECT
      public_dictionary_links.id AS link_id,
      public_dictionary_links.share_id AS share_id,
      public_dictionary_links.dictionary_id AS dictionary_id,
      public_dictionary_links.owner_token_hash AS owner_token_hash,
      public_dictionary_links.is_active AS is_active,
      dictionaries.title AS title,
      dictionaries.note AS note,
      dictionaries.created_at AS dictionary_created_at,
      dictionaries.updated_at AS dictionary_updated_at
    FROM public_dictionary_links
    INNER JOIN dictionaries
      ON dictionaries.id = public_dictionary_links.dictionary_id
      AND dictionaries.owner_token_hash = public_dictionary_links.owner_token_hash
    WHERE public_dictionary_links.share_id = ?
      AND public_dictionary_links.is_active = 1
    LIMIT 1
  `).bind(shareId).first();

  if (!link) {
    return jsonResponse({
      ok: false,
      error: "Public dictionary not found or inactive"
    }, origin, 404);
  }

  const wordsResult = await env.DB.prepare(`
    SELECT
      id,
      dictionary_id,
      word,
      transcription,
      translation,
      part_of_speech,
      meta,
      created_at,
      updated_at
    FROM dictionary_words
    WHERE dictionary_id = ?
      AND owner_token_hash = ?
    ORDER BY created_at DESC
  `).bind(link.dictionary_id, link.owner_token_hash).all();

  const words = (wordsResult.results || []).map(rowToWord);

  return jsonResponse({
    ok: true,
    readOnly: true,
    publicDictionary: {
      id: link.dictionary_id,
      shareId: link.share_id,
      title: link.title || "Без названия",
      note: link.note || "",
      words,
      createdAt: link.dictionary_created_at,
      updatedAt: link.dictionary_updated_at
    },
    dictionary: {
      id: link.dictionary_id,
      shareId: link.share_id,
      title: link.title || "Без названия",
      note: link.note || "",
      words,
      createdAt: link.dictionary_created_at,
      updatedAt: link.dictionary_updated_at
    }
  }, origin);
}

function generateShareId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "");
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getPublicAppBaseUrl(env, origin) {
  const configured = String(env.PUBLIC_APP_BASE_URL || env.PUBLIC_BASE_URL || "").trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin.replace(/\/+$/, "");
  }

  return ALLOWED_ORIGINS[0].replace(/\/+$/, "");
}


// ===== OPENAI / AI =====

async function handleAi(request, env, origin) {
  if (!env.OPENAI_API_KEY) {
    return jsonResponse({
      ok: false,
      error: "OPENAI_API_KEY is not configured"
    }, origin, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({
      ok: false,
      error: "Invalid JSON body"
    }, origin, 400);
  }

  const mode = String(body.mode || "").trim();
  const text = String(body.text || "").trim();

  const allowedModes = ["word_translate", "word_left", "word_right", "text_translate", "text_left", "word_card_short", "word_quick_translate"];

  if (!allowedModes.includes(mode)) {
    return jsonResponse({
      ok: false,
      error: "Unknown AI mode",
      allowed_modes: allowedModes
    }, origin, 400);
  }

  if (!text) {
    return jsonResponse({
      ok: false,
      error: "Text is required"
    }, origin, 400);
  }

  const promptResult = getPromptForMode(env, mode);

  if (promptResult.error) {
    return jsonResponse({
      ok: false,
      error: promptResult.error
    }, origin, 500);
  }

  const prompt = promptResult.prompt;
  const model = String(env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL).trim() || DEFAULT_OPENAI_MODEL;

  const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: prompt
        },
        {
          role: "user",
          content: text
        }
      ]
    })
  });

  const responseText = await openAiResponse.text();

  if (!openAiResponse.ok) {
    return jsonResponse({
      ok: false,
      error: responseText
    }, origin, openAiResponse.status);
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    return jsonResponse({
      ok: false,
      error: "OpenAI returned non-JSON response",
      raw: responseText
    }, origin, 500);
  }

  const outputText = extractOpenAiText(data);

  if (mode === "word_translate") {
    const card = parseStructuredWordTranslation(outputText, text);
    const displayText = formatStructuredWordTranslation(card);

    return jsonResponse({
      ok: true,
      mode,
      model,
      result: displayText,
      card,
      raw: outputText
    }, origin);
  }

  if (mode === "word_card_short") {
    const card = parseWordCard(outputText, text);

    return jsonResponse({
      ok: true,
      mode,
      model,
      result: card,
      raw: outputText
    }, origin);
  }

  return jsonResponse({
    ok: true,
    mode,
    model,
    result: outputText,
    raw: outputText
  }, origin);
}


function parseStructuredWordTranslation(outputText, fallbackWord) {
  const clean = stripMarkdownCodeFence(outputText);
  const fallback = String(fallbackWord || "").trim();

  try {
    const parsed = JSON.parse(clean);
    return normalizeStructuredWordTranslation(parsed, fallback);
  } catch {
    return {
      query: fallback,
      headword: fallback,
      word: fallback,
      detectedLanguage: "unknown",
      detected_language: "unknown",
      targetLanguage: "ru",
      target_language: "ru",
      correctionNote: "",
      correction_note: "",
      transcription: "",
      parts: [
        {
          pos: "other",
          label: "Other",
          labelRu: "другое",
          labelShortRu: "др.",
          meanings: [
            {
              translation: clean || "перевод позже",
              meaningRu: "",
              meaning_ru: "",
              explanationRu: "",
              explanation_ru: "",
              usageRu: "",
              usage_ru: "",
              example: null
            }
          ],
          examples: [],
          extraExamples: [],
          extra_examples: []
        }
      ]
    };
  }
}

function normalizeStructuredWordTranslation(card, fallbackWord) {
  const fallback = String(fallbackWord || "").trim();

  const isObject = value => value && typeof value === "object" && !Array.isArray(value);

  const spellcheck = isObject(card.spellcheck) ? card.spellcheck : {};
  const payload = isObject(card.card) ? card.card : card;

  const query = String(
    spellcheck.query ||
    card.query ||
    card.source_query ||
    card.sourceQuery ||
    fallback
  ).trim() || fallback;

  const headword = String(
    spellcheck.corrected_headword ||
    spellcheck.correctedHeadword ||
    spellcheck.headword ||
    payload.headword ||
    payload.head_word ||
    payload.word ||
    card.headword ||
    card.head_word ||
    card.word ||
    fallback
  ).trim() || fallback;

  const detectedLanguage = String(
    spellcheck.detected_language ||
    spellcheck.detectedLanguage ||
    card.detected_language ||
    card.detectedLanguage ||
    payload.detected_language ||
    payload.detectedLanguage ||
    "en"
  ).trim() || "en";

  const targetLanguage = String(
    card.target_language ||
    card.targetLanguage ||
    payload.target_language ||
    payload.targetLanguage ||
    "ru"
  ).trim() || "ru";

  const correctionNote = String(
    spellcheck.correction_note ||
    spellcheck.correctionNote ||
    card.correction_note ||
    card.correctionNote ||
    payload.correction_note ||
    payload.correctionNote ||
    ""
  ).trim();

  const transcription = String(
    payload.transcription ||
    payload.ipa ||
    payload.phonetic ||
    payload.pronunciation ||
    card.transcription ||
    card.ipa ||
    card.phonetic ||
    card.pronunciation ||
    ""
  ).trim();

  const rawParts = Array.isArray(payload.parts)
    ? payload.parts
    : (Array.isArray(card.parts) ? card.parts : []);

  const parts = rawParts
    .map(part => normalizeWordPart(part))
    .filter(part => part.meanings.length || part.examples.length || part.extraExamples.length);

  if (!parts.length) {
    parts.push({
      pos: "other",
      label: "Other",
      labelRu: "другое",
      labelShortRu: "др.",
      meanings: [
        {
          translation: String(payload.translation || card.translation || payload.meaning || card.meaning || "перевод позже").trim() || "перевод позже",
          meaningRu: String(payload.meaning_ru || payload.meaningRu || payload.explanation_ru || payload.explanationRu || card.meaning_ru || card.meaningRu || card.explanation_ru || card.explanationRu || "").trim(),
          meaning_ru: String(payload.meaning_ru || payload.meaningRu || payload.explanation_ru || payload.explanationRu || card.meaning_ru || card.meaningRu || card.explanation_ru || card.explanationRu || "").trim(),
          explanationRu: String(payload.explanation_ru || payload.explanationRu || payload.meaning_ru || payload.meaningRu || card.explanation_ru || card.explanationRu || card.meaning_ru || card.meaningRu || "").trim(),
          explanation_ru: String(payload.explanation_ru || payload.explanationRu || payload.meaning_ru || payload.meaningRu || card.explanation_ru || card.explanationRu || card.meaning_ru || card.meaningRu || "").trim(),
          usageRu: normalizeUsageRu(payload.usage_ru || payload.usageRu || payload.usage || card.usage_ru || card.usageRu || card.usage || ""),
          usage_ru: normalizeUsageRu(payload.usage_ru || payload.usageRu || payload.usage || card.usage_ru || card.usageRu || card.usage || ""),
          example: null
        }
      ],
      examples: [],
      extraExamples: [],
      extra_examples: []
    });
  }

  return {
    query,
    headword,
    word: headword,
    detectedLanguage,
    detected_language: detectedLanguage,
    targetLanguage,
    target_language: targetLanguage,
    correctionNote,
    correction_note: correctionNote,
    transcription,
    parts
  };
}

function normalizeWordPart(part = {}) {
  const pos = normalizePartOfSpeech(part.pos || part.part_of_speech || part.partOfSpeech || "other");
  const defaultLabelRu = getDefaultPartLabelRu(pos);
  const defaultShortRu = getDefaultPartShortRu(pos);
  const defaultEnglishLabel = getDefaultPartLabelEn(pos);

  const rawMeanings = Array.isArray(part.meanings) ? part.meanings : [];
  const meanings = rawMeanings
    .map(item => normalizeMeaning(item))
    .filter(item => item.translation || item.meaningRu || item.explanationRu || item.usageRu || item.example)
    .slice(0, 8);

  const rawExamples = Array.isArray(part.examples) ? part.examples : [];
  const examples = rawExamples
    .map(item => normalizeExample(item))
    .filter(item => item.source || item.translationRu)
    .slice(0, 4);

  const rawExtraExamples = Array.isArray(part.extra_examples)
    ? part.extra_examples
    : (Array.isArray(part.extraExamples) ? part.extraExamples : []);

  const extraExamples = rawExtraExamples
    .map(item => normalizeExample(item))
    .filter(item => item.source || item.translationRu)
    .slice(0, 6);

  const label = String(part.label || part.label_en || part.labelEn || defaultEnglishLabel).trim() || defaultEnglishLabel;
  const labelRu = String(part.label_ru || part.labelRu || defaultLabelRu).trim() || defaultLabelRu;
  const labelShortRu = String(part.label_short_ru || part.labelShortRu || defaultShortRu).trim() || defaultShortRu;

  return {
    pos,
    label,
    labelRu,
    labelShortRu,
    meanings,
    examples,
    extraExamples,
    extra_examples: extraExamples
  };
}

function normalizeMeaning(item = {}) {
  const example = normalizeExample(item.example || null);
  const hasExample = Boolean(example.source || example.translationRu);
  const meaningRu = String(item.meaning_ru || item.meaningRu || item.explanation_ru || item.explanationRu || item.note || "").trim();
  const usageRu = normalizeUsageRu(item.usage_ru || item.usageRu || item.usage || "");

  return {
    translation: String(item.translation || item.value || item.meaning || "").trim(),
    meaningRu,
    meaning_ru: meaningRu,
    explanationRu: meaningRu,
    explanation_ru: meaningRu,
    usageRu,
    usage_ru: usageRu,
    example: hasExample ? example : null
  };
}

function normalizeExample(item = {}) {
  if (!item || typeof item !== "object") {
    return { source: "", translationRu: "", translation_ru: "" };
  }

  const source = String(item.source || item.en || item.example || "").trim();
  const translationRu = String(item.translation_ru || item.translationRu || item.ru || item.translation || "").trim();

  return {
    source,
    translationRu,
    translation_ru: translationRu
  };
}

function normalizeUsageRu(value) {
  const raw = String(value || "").trim();
  const clean = raw.toLowerCase();

  const map = {
    common: "обычное значение",
    informal: "разговорное",
    technical: "техническое",
    figurative: "переносное",
    rare: "редкое"
  };

  return map[clean] || raw;
}

function normalizePartOfSpeech(value) {
  const clean = String(value || "").trim().toLowerCase();

  const map = {
    n: "noun",
    noun: "noun",
    "существительное": "noun",
    v: "verb",
    verb: "verb",
    "глагол": "verb",
    adj: "adjective",
    adjective: "adjective",
    "прилагательное": "adjective",
    adv: "adverb",
    adverb: "adverb",
    "наречие": "adverb",
    prep: "preposition",
    preposition: "preposition",
    "предлог": "preposition",
    conj: "conjunction",
    conjunction: "conjunction",
    "союз": "conjunction",
    pron: "pronoun",
    pronoun: "pronoun",
    "местоимение": "pronoun",
    interjection: "interjection",
    "междометие": "interjection",
    phrase: "phrase",
    "фраза": "phrase",
    other: "other",
    "другое": "other"
  };

  return map[clean] || clean || "other";
}

function getDefaultPartLabelEn(pos) {
  const map = {
    noun: "Noun",
    verb: "Verb",
    adjective: "Adjective",
    adverb: "Adverb",
    preposition: "Preposition",
    conjunction: "Conjunction",
    pronoun: "Pronoun",
    interjection: "Interjection",
    phrase: "Phrase",
    other: "Other"
  };

  return map[pos] || "Other";
}

function getDefaultPartLabelRu(pos) {
  const map = {
    noun: "существительное",
    verb: "глагол",
    adjective: "прилагательное",
    adverb: "наречие",
    preposition: "предлог",
    conjunction: "союз",
    pronoun: "местоимение",
    interjection: "междометие",
    phrase: "фраза",
    other: "другое"
  };

  return map[pos] || "другое";
}

function getDefaultPartShortRu(pos) {
  const map = {
    noun: "сущ.",
    verb: "гл.",
    adjective: "прил.",
    adverb: "нар.",
    preposition: "предл.",
    conjunction: "союз",
    pronoun: "мест.",
    interjection: "межд.",
    phrase: "фраза",
    other: "др."
  };

  return map[pos] || "др.";
}

function formatStructuredWordTranslation(card) {
  const lines = [];
  const word = String(card.headword || card.word || card.query || "").trim();

  if (word) lines.push(word);

  if (card.correctionNote || card.correction_note) {
    lines.push(String(card.correctionNote || card.correction_note).trim());
  }

  for (const part of card.parts || []) {
    lines.push("");
    lines.push(String(part.labelRu || getDefaultPartLabelRu(part.pos)).toUpperCase());

    if (Array.isArray(part.meanings) && part.meanings.length) {
      lines.push("Значения:");

      part.meanings.forEach((meaning, index) => {
        const translation = meaning.translation ? `${index + 1}. ${meaning.translation}` : `${index + 1}.`;
        const explanation = meaning.meaningRu || meaning.meaning_ru || meaning.explanationRu || meaning.explanation_ru || "";
        const usage = meaning.usageRu || meaning.usage_ru || "";
        const explanationText = explanation ? ` — ${explanation}` : "";
        const usageText = usage ? ` (${usage})` : "";

        lines.push(`${translation}${explanationText}${usageText}`);

        if (meaning.example && (meaning.example.source || meaning.example.translationRu || meaning.example.translation_ru)) {
          if (meaning.example.source) lines.push(`   ${meaning.example.source}`);
          if (meaning.example.translationRu || meaning.example.translation_ru) {
            lines.push(`   ${meaning.example.translationRu || meaning.example.translation_ru}`);
          }
        }
      });
    }

    const extraExamples = Array.isArray(part.extraExamples) && part.extraExamples.length
      ? part.extraExamples
      : (Array.isArray(part.examples) ? part.examples : []);

    if (extraExamples.length) {
      lines.push("");
      lines.push("Дополнительные примеры:");

      extraExamples.forEach((example, index) => {
        const source = example.source || "";
        const translation = example.translationRu || example.translation_ru || "";

        if (source && translation) {
          lines.push(`${index + 1}. ${source}`);
          lines.push(`   ${translation}`);
        } else if (source || translation) {
          lines.push(`${index + 1}. ${source || translation}`);
        }
      });
    }
  }

  return lines.join("\n").trim();
}


function getPromptForMode(env, mode) {
  const promptMap = {
    word_translate: {
      name: "PROMPT_WORD_TRANSLATE",
      value: env.PROMPT_WORD_TRANSLATE
    },
    word_left: {
      name: "PROMPT_WORD_LEFT",
      value: env.PROMPT_WORD_LEFT
    },
    word_right: {
      name: "PROMPT_WORD_RIGHT",
      value: env.PROMPT_WORD_RIGHT
    },
    text_translate: {
      name: "PROMPT_TEXT_TRANSLATE",
      value: env.PROMPT_TEXT_TRANSLATE
    },
    text_left: {
      name: "PROMPT_TEXT_LEFT",
      value: env.PROMPT_TEXT_LEFT
    },
    word_card_short: {
      name: "PROMPT_WORD_CARD_SHORT",
      value: env.PROMPT_WORD_CARD_SHORT
    },
    word_quick_translate: {
      name: "PROMPT_WORD_QUICK_TRANSLATE",
      value: env.PROMPT_WORD_QUICK_TRANSLATE
    }
  };

  const item = promptMap[mode];

  if (!item) {
    return {
      prompt: "",
      error: `Prompt for mode ${mode} is not configured`
    };
  }

  const value = String(item.value || "").trim();

  if (!value) {
    return {
      prompt: "",
      error: `${item.name} is not configured`
    };
  }

  return {
    prompt: value,
    error: ""
  };
}

function extractOpenAiText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const parts = [];

  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      if (!item || !Array.isArray(item.content)) continue;

      for (const content of item.content) {
        if (!content) continue;

        if (typeof content.text === "string") {
          parts.push(content.text);
        }

        if (typeof content.output_text === "string") {
          parts.push(content.output_text);
        }
      }
    }
  }

  return parts.join("\n").trim();
}

function parseWordCard(outputText, fallbackWord) {
  const clean = stripMarkdownCodeFence(outputText);

  try {
    const parsed = JSON.parse(clean);
    return normalizeWordCard(parsed, fallbackWord);
  } catch {
    return {
      word: String(fallbackWord || "").trim(),
      transcription: "—",
      translation: clean || "перевод позже",
      partOfSpeech: "other"
    };
  }
}

function normalizeWordCard(card, fallbackWord) {
  const word = String(card.word || fallbackWord || "").trim();
  const transcription = String(card.transcription || "—").trim();
  const translation = String(card.translation || "перевод позже").trim();
  const partOfSpeech = String(card.partOfSpeech || card.part_of_speech || "other").trim();

  return {
    word,
    transcription,
    translation,
    partOfSpeech
  };
}

function stripMarkdownCodeFence(text) {
  let clean = String(text || "").trim();

  if (clean.startsWith("```")) {
    clean = clean.replace(/^```[a-zA-Z0-9_-]*\s*/, "");
    clean = clean.replace(/\s*```$/, "");
  }

  return clean.trim();
}




// ===== TEXT FILE IMPORT / DOCX =====

const TEXT_IMPORT_MAX_FILE_BYTES = 12 * 1024 * 1024;
const TEXT_IMPORT_MAX_OUTPUT_CHARS = 700000;

async function handleTextImport(request, env, origin) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse({
      ok: false,
      error: "Invalid multipart/form-data body"
    }, origin, 400);
  }

  const file = formData.get("file") || formData.get("document") || formData.get("docx");

  if (!file || typeof file === "string") {
    return jsonResponse({
      ok: false,
      error: "Файл обязателен. Поддерживается DOCX."
    }, origin, 400);
  }

  const filename = String(file.name || "document.docx").trim() || "document.docx";
  const mime = String(file.type || "").toLowerCase();
  const lowerName = filename.toLowerCase();
  const isDocx = lowerName.endsWith(".docx") || mime.includes("wordprocessingml.document");

  if (!isDocx) {
    return jsonResponse({
      ok: false,
      error: "Формат не поддерживается. Сейчас можно загрузить обычный .docx с текстом. Старый .doc, PDF, картинки и сканы пока не разбираются этим импортом.",
      supported: ["docx"]
    }, origin, 400);
  }

  if (Number(file.size || 0) > TEXT_IMPORT_MAX_FILE_BYTES) {
    return jsonResponse({
      ok: false,
      error: "DOCX слишком большой. Для первого этапа лимит — 12 МБ."
    }, origin, 413);
  }

  let bytes;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return jsonResponse({
      ok: false,
      error: "Не удалось прочитать загруженный DOCX."
    }, origin, 400);
  }

  try {
    const result = await extractTextFromDocxBytes(bytes);
    let text = String(result.text || "").trim();
    const warnings = Array.isArray(result.warnings) ? result.warnings : [];

    if (!text) {
      return jsonResponse({
        ok: false,
        error: "DOCX прочитан, но текст не найден. Возможно, внутри только картинки/сканы или нестандартные текстовые блоки. Для сканов используйте фото/камеру.",
        warnings
      }, origin, 422);
    }

    if (text.length > TEXT_IMPORT_MAX_OUTPUT_CHARS) {
      text = text.slice(0, TEXT_IMPORT_MAX_OUTPUT_CHARS).trim();
      warnings.push("Текст был обрезан из-за большого размера документа.");
    }

    return jsonResponse({
      ok: true,
      mode: "text_import",
      type: "docx",
      filename,
      text,
      result: text,
      warnings
    }, origin);
  } catch (err) {
    return jsonResponse({
      ok: false,
      error: String(err && err.message ? err.message : err) || "Не удалось разобрать DOCX. Попробуйте сохранить файл заново как .docx или .txt."
    }, origin, 400);
  }
}

async function extractTextFromDocxBytes(bytes) {
  if (!bytes || bytes.length < 22) {
    throw new Error("Файл слишком маленький или повреждён. Это не похоже на DOCX.");
  }

  const entries = await readZipEntries(bytes);
  const documentXmlBytes = entries.get("word/document.xml");

  if (!documentXmlBytes) {
    throw new Error("В DOCX не найден word/document.xml. Возможно, файл повреждён или это не настоящий .docx.");
  }

  const xml = new TextDecoder("utf-8").decode(documentXmlBytes);
  const text = extractDocxMainText(xml);
  const warnings = [];

  if (entries.has("word/footnotes.xml")) {
    warnings.push("Сноски в первой версии импорта пропущены.");
  }

  if ([...entries.keys()].some(name => /^word\/media\//i.test(name))) {
    warnings.push("Картинки и схемы в DOCX не извлекаются.");
  }

  if ([...entries.keys()].some(name => /^word\/(header|footer)\d*\.xml$/i.test(name))) {
    warnings.push("Колонтитулы пропущены.");
  }

  return { text, warnings };
}

async function readZipEntries(bytes) {
  const eocdOffset = findZipEndOfCentralDirectory(bytes);

  if (eocdOffset < 0) {
    throw new Error("Не удалось открыть DOCX как zip-архив. Файл может быть повреждён.");
  }

  const totalEntries = readUInt16LE(bytes, eocdOffset + 10);
  const centralDirectorySize = readUInt32LE(bytes, eocdOffset + 12);
  const centralDirectoryOffset = readUInt32LE(bytes, eocdOffset + 16);

  if (!centralDirectoryOffset || centralDirectoryOffset + centralDirectorySize > bytes.length) {
    throw new Error("Структура DOCX повреждена: неверная центральная директория zip.");
  }

  const entries = new Map();
  let offset = centralDirectoryOffset;
  const decoder = new TextDecoder("utf-8");

  for (let index = 0; index < totalEntries && offset + 46 <= bytes.length; index += 1) {
    const signature = readUInt32LE(bytes, offset);
    if (signature !== 0x02014b50) break;

    const flags = readUInt16LE(bytes, offset + 8);
    const method = readUInt16LE(bytes, offset + 10);
    const compressedSize = readUInt32LE(bytes, offset + 20);
    const uncompressedSize = readUInt32LE(bytes, offset + 24);
    const fileNameLength = readUInt16LE(bytes, offset + 28);
    const extraLength = readUInt16LE(bytes, offset + 30);
    const commentLength = readUInt16LE(bytes, offset + 32);
    const localHeaderOffset = readUInt32LE(bytes, offset + 42);

    const nameStart = offset + 46;
    const nameEnd = nameStart + fileNameLength;
    const fileName = decoder.decode(bytes.slice(nameStart, nameEnd));

    if (flags & 0x0001) {
      throw new Error("DOCX защищён/зашифрован. Такой файл нельзя разобрать.");
    }

    if (!fileName.endsWith("/")) {
      const content = await readZipEntryContent(bytes, localHeaderOffset, compressedSize, uncompressedSize, method, fileName);
      entries.set(fileName, content);
    }

    offset = nameEnd + extraLength + commentLength;
  }

  return entries;
}

async function readZipEntryContent(bytes, localHeaderOffset, compressedSize, uncompressedSize, method, fileName) {
  if (localHeaderOffset + 30 > bytes.length || readUInt32LE(bytes, localHeaderOffset) !== 0x04034b50) {
    throw new Error(`DOCX повреждён: не найден local header для ${fileName}.`);
  }

  const localNameLength = readUInt16LE(bytes, localHeaderOffset + 26);
  const localExtraLength = readUInt16LE(bytes, localHeaderOffset + 28);
  const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
  const dataEnd = dataStart + compressedSize;

  if (dataEnd > bytes.length) {
    throw new Error(`DOCX повреждён: неверный размер файла ${fileName}.`);
  }

  const compressed = bytes.slice(dataStart, dataEnd);

  if (method === 0) {
    return compressed;
  }

  if (method === 8) {
    return await inflateZipDeflateRaw(compressed, uncompressedSize, fileName);
  }

  throw new Error(`DOCX содержит неподдерживаемый метод сжатия (${method}) для ${fileName}.`);
}

async function inflateZipDeflateRaw(compressed, expectedSize, fileName) {
  if (typeof DecompressionStream !== "function") {
    throw new Error("Среда Worker не поддерживает DecompressionStream для распаковки DOCX.");
  }

  const formats = ["deflate-raw", "deflate"];
  let lastError = null;

  for (const format of formats) {
    try {
      const stream = new DecompressionStream(format);
      const writer = stream.writable.getWriter();
      await writer.write(compressed);
      await writer.close();
      const buffer = await new Response(stream.readable).arrayBuffer();
      const output = new Uint8Array(buffer);

      if (!expectedSize || output.length === expectedSize || format === "deflate-raw") {
        return output;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`Не удалось распаковать ${fileName}: ${String(lastError?.message || lastError || "unknown")}`);
}

function findZipEndOfCentralDirectory(bytes) {
  const minOffset = Math.max(0, bytes.length - 65557);

  for (let offset = bytes.length - 22; offset >= minOffset; offset -= 1) {
    if (readUInt32LE(bytes, offset) === 0x06054b50) {
      return offset;
    }
  }

  return -1;
}

function readUInt16LE(bytes, offset) {
  return (bytes[offset] || 0) | ((bytes[offset + 1] || 0) << 8);
}

function readUInt32LE(bytes, offset) {
  return (
    (bytes[offset] || 0) |
    ((bytes[offset + 1] || 0) << 8) |
    ((bytes[offset + 2] || 0) << 16) |
    ((bytes[offset + 3] || 0) << 24)
  ) >>> 0;
}

function extractDocxMainText(xml) {
  const cleanXml = String(xml || "")
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!--([\s\S]*?)-->/g, "");

  const bodyMatch = cleanXml.match(/<w:body\b[\s\S]*?<\/w:body>/i);
  const body = bodyMatch ? bodyMatch[0] : cleanXml;
  const blocks = [];
  const blockRegex = /<w:tbl\b[\s\S]*?<\/w:tbl>|<w:p\b[\s\S]*?<\/w:p>/gi;
  let match;

  while ((match = blockRegex.exec(body))) {
    const block = match[0];

    if (/^<w:tbl\b/i.test(block)) {
      const tableText = extractDocxTableText(block);
      if (tableText) blocks.push(tableText);
      continue;
    }

    const paragraphText = extractDocxParagraphText(block);
    if (paragraphText) blocks.push(paragraphText);
  }

  return blocks
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function extractDocxTableText(tableXml) {
  const rows = [];
  const rowRegex = /<w:tr\b[\s\S]*?<\/w:tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(tableXml))) {
    const rowXml = rowMatch[0];
    const cells = [];
    const cellRegex = /<w:tc\b[\s\S]*?<\/w:tc>/gi;
    let cellMatch;

    while ((cellMatch = cellRegex.exec(rowXml))) {
      const cellXml = cellMatch[0];
      const paragraphs = [];
      const paragraphRegex = /<w:p\b[\s\S]*?<\/w:p>/gi;
      let paragraphMatch;

      while ((paragraphMatch = paragraphRegex.exec(cellXml))) {
        const text = extractDocxParagraphText(paragraphMatch[0]);
        if (text) paragraphs.push(text);
      }

      cells.push(paragraphs.join(" / ").trim());
    }

    const rowText = cells
      .map(cell => cell.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join(" | ")
      .trim();

    if (rowText) rows.push(rowText);
  }

  return rows.join("\n").trim();
}

function extractDocxParagraphText(paragraphXml) {
  const parts = [];
  const tokenRegex = /<w:t\b[^>]*>[\s\S]*?<\/w:t>|<w:tab\b[^>]*\/?\s*>|<w:br\b[^>]*\/?\s*>|<w:cr\b[^>]*\/?\s*>/gi;
  let match;

  while ((match = tokenRegex.exec(paragraphXml))) {
    const token = match[0];

    if (/^<w:tab\b/i.test(token)) {
      parts.push("\t");
      continue;
    }

    if (/^<w:(br|cr)\b/i.test(token)) {
      parts.push("\n");
      continue;
    }

    const textMatch = token.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/i);
    if (textMatch) {
      parts.push(decodeXmlEntities(textMatch[1]));
    }
  }

  return parts
    .join("")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.!?;:%])/g, "$1")
    .replace(/([([{])\s+/g, "$1")
    .trim();
}

function decodeXmlEntities(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, "&");
}

// ===== OPENAI AUDIO / SPEECH TO TEXT =====

async function handleAudioTranscribe(request, env, origin) {
  if (!env.OPENAI_API_KEY) {
    return jsonResponse({
      ok: false,
      error: "OPENAI_API_KEY is not configured"
    }, origin, 500);
  }

  const model = String(env.OPENAI_TRANSCRIBE_MODEL || "").trim();

  if (!model) {
    return jsonResponse({
      ok: false,
      error: "OPENAI_TRANSCRIBE_MODEL is not configured"
    }, origin, 500);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse({
      ok: false,
      error: "Invalid multipart/form-data body"
    }, origin, 400);
  }

  const file = formData.get("file") || formData.get("audio") || formData.get("recording");

  if (!file || typeof file === "string") {
    return jsonResponse({
      ok: false,
      error: "Audio file is required"
    }, origin, 400);
  }

  const audioForm = new FormData();
  audioForm.append("model", model);
  audioForm.append("file", file, file.name || "recording.webm");
  audioForm.append("response_format", "json");

  const openAiResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`
    },
    body: audioForm
  });

  const responseText = await openAiResponse.text();

  if (!openAiResponse.ok) {
    return jsonResponse({
      ok: false,
      error: responseText
    }, origin, openAiResponse.status);
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    const plainText = String(responseText || "").trim();

    return jsonResponse({
      ok: true,
      mode: "audio_transcribe",
      model,
      text: plainText,
      result: plainText,
      raw: responseText
    }, origin);
  }

  const transcribedText = String(data.text || data.output_text || "").trim();

  return jsonResponse({
    ok: true,
    mode: "audio_transcribe",
    model,
    text: transcribedText,
    result: transcribedText,
    raw: data
  }, origin);
}

// ===== OPENAI VISION / IMAGE OCR =====

async function handleVisionExtractText(request, env, origin) {
  if (!env.OPENAI_API_KEY) {
    return jsonResponse({
      ok: false,
      error: "OPENAI_API_KEY is not configured"
    }, origin, 500);
  }

  const prompt = String(env.PROMPT_IMAGE_TEXT_EXTRACT || "").trim();

  if (!prompt) {
    return jsonResponse({
      ok: false,
      error: "PROMPT_IMAGE_TEXT_EXTRACT is not configured"
    }, origin, 500);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse({
      ok: false,
      error: "Invalid multipart/form-data body"
    }, origin, 400);
  }

  const file = formData.get("file") || formData.get("image") || formData.get("photo");

  if (!file || typeof file === "string") {
    return jsonResponse({
      ok: false,
      error: "Image file is required"
    }, origin, 400);
  }

  const mimeType = String(file.type || "application/octet-stream").toLowerCase();
  const allowedTypes = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
  ]);

  if (!allowedTypes.has(mimeType)) {
    return jsonResponse({
      ok: false,
      error: "Unsupported image type. Please use JPEG, PNG, or WEBP.",
      received_type: mimeType
    }, origin, 400);
  }

  const maxImageBytes = Number(env.IMAGE_TEXT_EXTRACT_MAX_BYTES || 10 * 1024 * 1024);

  if (typeof file.size === "number" && file.size > maxImageBytes) {
    return jsonResponse({
      ok: false,
      error: `Image is too large. Max size is ${Math.round(maxImageBytes / 1024 / 1024)} MB.`
    }, origin, 413);
  }

  const imageBuffer = await file.arrayBuffer();

  if (!imageBuffer.byteLength) {
    return jsonResponse({
      ok: false,
      error: "Image file is empty"
    }, origin, 400);
  }

  if (imageBuffer.byteLength > maxImageBytes) {
    return jsonResponse({
      ok: false,
      error: `Image is too large. Max size is ${Math.round(maxImageBytes / 1024 / 1024)} MB.`
    }, origin, 413);
  }

  const model = String(env.OPENAI_VISION_MODEL || env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL).trim() || DEFAULT_OPENAI_MODEL;
  const imageBase64 = arrayBufferToBase64(imageBuffer);
  const imageUrl = `data:${mimeType === "image/jpg" ? "image/jpeg" : mimeType};base64,${imageBase64}`;

  const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt
            },
            {
              type: "input_image",
              image_url: imageUrl
            }
          ]
        }
      ]
    })
  });

  const responseText = await openAiResponse.text();

  if (!openAiResponse.ok) {
    return jsonResponse({
      ok: false,
      error: responseText
    }, origin, openAiResponse.status);
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    return jsonResponse({
      ok: false,
      error: "OpenAI returned non-JSON response",
      raw: responseText
    }, origin, 500);
  }

  const extractedText = extractOpenAiText(data).trim();

  return jsonResponse({
    ok: true,
    mode: "image_text_extract",
    model,
    text: extractedText,
    result: extractedText,
    raw: extractedText
  }, origin);
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

// ===== DEEPL DOCUMENTS =====

async function handleUpload(request, env, origin) {
  const formData = await request.formData();
  const file = formData.get("file");
  const targetLang = formData.get("target_lang") || "RU";

  if (!file) {
    return jsonResponse({ ok: false, error: "No file uploaded" }, origin, 400);
  }

  const deeplForm = new FormData();
  deeplForm.append("file", file, file.name || "document.pdf");
  deeplForm.append("target_lang", targetLang);

  const deeplResponse = await fetch("https://api.deepl.com/v2/document", {
    method: "POST",
    headers: {
      "Authorization": `DeepL-Auth-Key ${env.DEEPL_API_KEY}`
    },
    body: deeplForm
  });

  const text = await deeplResponse.text();

  if (!deeplResponse.ok) {
    return jsonResponse({
      ok: false,
      error: text
    }, origin, deeplResponse.status);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return jsonResponse({
      ok: false,
      error: "DeepL returned non-JSON response",
      raw: text
    }, origin, 500);
  }

  return jsonResponse({
    ok: true,
    document_id: data.document_id,
    document_key: data.document_key
  }, origin);
}

async function handleStatus(request, env, origin) {
  const body = await request.json();

  const documentId = body.document_id;
  const documentKey = body.document_key;

  if (!documentId || !documentKey) {
    return jsonResponse({
      ok: false,
      error: "document_id and document_key are required"
    }, origin, 400);
  }

  const deeplForm = new URLSearchParams();
  deeplForm.append("document_key", documentKey);

  const deeplResponse = await fetch(
    `https://api.deepl.com/v2/document/${encodeURIComponent(documentId)}`,
    {
      method: "POST",
      headers: {
        "Authorization": `DeepL-Auth-Key ${env.DEEPL_API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: deeplForm
    }
  );

  const text = await deeplResponse.text();

  if (!deeplResponse.ok) {
    return jsonResponse({
      ok: false,
      error: text
    }, origin, deeplResponse.status);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return jsonResponse({
      ok: false,
      error: "DeepL returned non-JSON response",
      raw: text
    }, origin, 500);
  }

  return jsonResponse({
    ok: true,
    ...data
  }, origin);
}

async function handleDownload(request, env, origin) {
  const body = await request.json();

  const documentId = body.document_id;
  const documentKey = body.document_key;

  if (!documentId || !documentKey) {
    return jsonResponse({
      ok: false,
      error: "document_id and document_key are required"
    }, origin, 400);
  }

  const deeplForm = new URLSearchParams();
  deeplForm.append("document_key", documentKey);

  const deeplResponse = await fetch(
    `https://api.deepl.com/v2/document/${encodeURIComponent(documentId)}/result`,
    {
      method: "POST",
      headers: {
        "Authorization": `DeepL-Auth-Key ${env.DEEPL_API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: deeplForm
    }
  );

  if (!deeplResponse.ok) {
    const errorText = await deeplResponse.text();
    return jsonResponse({
      ok: false,
      error: errorText
    }, origin, deeplResponse.status);
  }

  const contentType = deeplResponse.headers.get("Content-Type") || "application/octet-stream";
  const file = await deeplResponse.arrayBuffer();

  return new Response(file, {
    status: 200,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="translated-document.pdf"`
    }
  });
}

function uid(prefix = "id") {
  if (crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function jsonResponse(data, origin, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function corsHeaders(origin) {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Expose-Headers": "Content-Disposition, Content-Type"
  };
}
