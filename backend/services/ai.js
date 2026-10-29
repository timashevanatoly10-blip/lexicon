// Shared original LEXICON AI prompts/parsers; legacy REST retains its response format.
const DEFAULT_OPENAI_MODEL = "gpt-5.2";
export function requestAi(env, mode, text, background = false) {
  const prompt=getPromptForMode(env,mode);if(prompt.error||!env.OPENAI_API_KEY)throw Error('AI_CONFIGURATION');
  return fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:String(env.OPENAI_MODEL||DEFAULT_OPENAI_MODEL).trim()||DEFAULT_OPENAI_MODEL,input:[{role:'system',content:prompt.prompt},{role:'user',content:text}],...(background?{background:true,store:true,max_output_tokens:12000}:{})}),...(background?{signal:AbortSignal.timeout(25000)}:{})});
}
export function retrieveAi(env,id){if(!/^resp_[A-Za-z0-9_-]+$/.test(id))throw Error('INVALID_RESPONSE_ID');return fetch('https://api.openai.com/v1/responses/'+id,{headers:{Authorization:'Bearer '+env.OPENAI_API_KEY},signal:AbortSignal.timeout(20000)});}
export function fullPanel(mode,data,word){
  if(data.status!=='completed')throw Error('INCOMPLETE_PANEL');const text=extractOpenAiText(data);let raw;try{raw=JSON.parse(stripMarkdownCodeFence(text));}catch{throw Error('INVALID_PANEL_JSON');}
  const panel=mode==='word_translate'?parseStructuredWordTranslation(text,word):(raw.card||raw);
  if(!panel||!Array.isArray(panel.parts)||!panel.parts.length||JSON.stringify(panel).length>150000)throw Error('INCOMPLETE_PANEL');
  for(const p of panel.parts){
    if(mode==='word_translate'){if(!p.meanings?.length||!p.meanings.every(m=>m.translation&&m.example?.source&&m.example?.translation_ru)||!panel.transcription)throw Error('INCOMPLETE_CENTER');}
    else if(mode==='word_left'){for(const k of ['target_meaning_ru','mnemonic','association','mini_scene','memory_hook','micro_story_ru','visual_prompt_ru'])if(typeof p[k]!=='string'||!p[k].trim())throw Error('INCOMPLETE_LEFT');if(!Array.isArray(p.english_anchor_examples)||!p.english_anchor_examples.length||!p.english_anchor_examples.every(e=>e.source&&e.translation_ru)||!Array.isArray(p.chips))throw Error('INCOMPLETE_LEFT');}
    else {for(const k of ['english_definition','semantic_core','synonyms','antonyms','collocations','grammar_patterns','usage_notes','common_mistakes','phrases','word_family','etymology','level_frequency','advice_ru'])if(!(k in p))throw Error('INCOMPLETE_RIGHT');for(const k of ['semantic_core','synonyms','antonyms','collocations','grammar_patterns','usage_notes','common_mistakes','phrases','word_family'])if(!Array.isArray(p[k]))throw Error('INCOMPLETE_RIGHT');if(!p.english_definition||!p.collocations.length||!p.grammar_patterns.length||!p.grammar_patterns.every(g=>g.pattern&&g.example&&g.translation_ru)||!p.collocations.every(c=>c.phrase&&c.translation_ru)||!p.level_frequency||typeof p.level_frequency!=='object')throw Error('INCOMPLETE_RIGHT');}
  }return panel;
}
export async function handleAi(request, env, origin, jsonResponse) {
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

  const openAiResponse = await requestAi(env, mode, text);

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


export function parseStructuredWordTranslation(outputText, fallbackWord) {
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


export function getPromptForMode(env, mode) {
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

export function extractOpenAiText(data) {
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

export function stripMarkdownCodeFence(text) {
  let clean = String(text || "").trim();

  if (clean.startsWith("```")) {
    clean = clean.replace(/^```[a-zA-Z0-9_-]*\s*/, "");
    clean = clean.replace(/\s*```$/, "");
  }

  return clean.trim();
}
