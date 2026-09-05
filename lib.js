const DANISH_LOCALE = 'da-DK';

const STOP_WORDS = new Set([
  'af', 'at', 'de', 'dem', 'den', 'der', 'det', 'du', 'eller', 'en', 'er', 'et', 'for',
  'fra', 'han', 'har', 'hun', 'hvad', 'hvem', 'hvor', 'i', 'ikke', 'jeg', 'kan', 'med',
  'men', 'mig', 'min', 'mit', 'må', 'noget', 'og', 'om', 'os', 'på', 'skal', 'som',
  'til', 'vi', 'vil', 'var', 'ved', 'være', 'været', 'denne', 'dette', 'disse', 'så',
]);

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase(DANISH_LOCALE)
    .replace(/[’`]/gu, "'")
    .trim();
}

export function normalizeWord(value) {
  return normalizeText(value).replace(/[^\p{L}\p{M}'-]/gu, '');
}


function cleanDisplayWord(value) {
  const match = String(value ?? '')
    .normalize('NFKC')
    .trim()
    .match(/[\p{L}\p{M}][\p{L}\p{M}'’-]*/u);
  return match ? match[0].replace(/[’`]/gu, "'") : '';
}

function tokenizeDisplay(value) {
  const matches = String(value ?? '')
    .normalize('NFKC')
    .match(/[\p{L}\p{M}][\p{L}\p{M}'’-]*/gu) ?? [];
  return matches.map((word) => word.replace(/[’`]/gu, "'"));
}

export function tokenize(value) {
  const matches = String(value ?? '').normalize('NFKC').match(/[\p{L}\p{M}][\p{L}\p{M}'’-]*/gu) ?? [];
  return matches.map(normalizeWord).filter(Boolean);
}

export function unique(values) {
  return [...new Set(values)];
}

export function clampPriority(value, fallback = 50) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(1, Math.min(100, Math.round(number)));
}

export function createId(prefix = 'item') {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getCurrentTokenInfo(text, caretPosition = String(text ?? '').length) {
  const value = String(text ?? '');
  const caret = Math.max(0, Math.min(value.length, Number(caretPosition) || 0));
  const beforeCaret = value.slice(0, caret);
  const match = beforeCaret.match(/[\p{L}\p{M}'’-]+$/u);

  if (!match) {
    return {
      prefix: '',
      rawPrefix: '',
      start: caret,
      end: caret,
      caret,
    };
  }

  return {
    prefix: normalizeWord(match[0]),
    rawPrefix: match[0],
    start: caret - match[0].length,
    end: caret,
    caret,
  };
}

function applyTypedCase(word, rawPrefix, tokenStart) {
  if (!word) return word;
  const startsUppercase = rawPrefix && rawPrefix[0] === rawPrefix[0].toLocaleUpperCase(DANISH_LOCALE)
    && rawPrefix[0] !== rawPrefix[0].toLocaleLowerCase(DANISH_LOCALE);
  const atSentenceStart = tokenStart === 0;

  if (startsUppercase || atSentenceStart) {
    return word[0].toLocaleUpperCase(DANISH_LOCALE) + word.slice(1);
  }
  return word;
}

export function replaceCurrentToken(text, caretPosition, replacement, addTrailingSpace = true) {
  const value = String(text ?? '');
  const info = getCurrentTokenInfo(value, caretPosition);
  const replacementWord = applyTypedCase(String(replacement ?? '').trim(), info.rawPrefix, info.start);
  const before = value.slice(0, info.start);
  let after = value.slice(info.end);
  let spacer = '';

  if (addTrailingSpace) {
    if (after.startsWith(' ')) {
      after = after.replace(/^ +/u, ' ');
    } else if (after.length === 0 || !/^[,.;:!?)]/u.test(after)) {
      spacer = ' ';
    }
  }

  const nextText = `${before}${replacementWord}${spacer}${after}`;
  const selection = before.length + replacementWord.length + spacer.length;
  return { text: nextText, selectionStart: selection, selectionEnd: selection };
}

function recencyBonus(lastUsed) {
  const timestamp = Number(lastUsed);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 0;
  const ageHours = Math.max(0, (Date.now() - timestamp) / 3_600_000);
  if (ageHours < 1) return 180;
  if (ageHours < 24) return 100;
  if (ageHours < 168) return 45;
  return 0;
}

function usageBonus(stats) {
  if (!stats) return 0;
  const count = Math.max(0, Number(stats.count) || 0);
  return Math.min(700, count * 55) + recencyBonus(stats.lastUsed);
}

export function rankWordSuggestions(words, prefix, usage = {}, limit = 6) {
  const normalizedPrefix = normalizeWord(prefix);
  if (!normalizedPrefix) return [];

  const results = [];
  const seen = new Set();

  for (const entry of Array.isArray(words) ? words : []) {
    const text = String(entry?.text ?? '').trim();
    const normalized = normalizeWord(text);
    if (!normalized || seen.has(normalized) || normalized === normalizedPrefix) continue;
    if (!normalized.startsWith(normalizedPrefix)) continue;

    seen.add(normalized);
    const priority = clampPriority(entry.priority);
    const lengthPenalty = Math.max(0, normalized.length - normalizedPrefix.length) * 3;
    const score = 5_000 + priority * 12 + usageBonus(usage[normalized]) - lengthPenalty;
    results.push({ ...entry, text, normalized, score });
  }

  return results
    .sort((a, b) => b.score - a.score
      || a.text.length - b.text.length
      || a.text.localeCompare(b.text, DANISH_LOCALE))
    .slice(0, Math.max(1, Number(limit) || 6));
}

export function deriveKeywords(sentence, maximum = 8) {
  const terms = unique(tokenize(sentence));
  const meaningful = terms.filter((term) => term.length > 1 && !STOP_WORDS.has(term));
  return meaningful.slice(0, maximum);
}

function sentenceTerms(sentence) {
  return new Set([
    ...tokenize(sentence?.text),
    ...(Array.isArray(sentence?.keywords) ? sentence.keywords.map(normalizeWord) : []),
  ].filter(Boolean));
}

export function rankSentenceSuggestions(
  sentences,
  queryTerms,
  focusTerm,
  usage = {},
  limit = 5,
) {
  const normalizedQuery = unique((Array.isArray(queryTerms) ? queryTerms : tokenize(queryTerms)).map(normalizeWord).filter(Boolean));
  const lastQueryTerm = normalizedQuery.length ? normalizedQuery[normalizedQuery.length - 1] : '';
  const focus = normalizeWord(focusTerm) || lastQueryTerm || '';
  if (!focus) return [];

  const results = [];
  const seen = new Set();

  for (const sentence of Array.isArray(sentences) ? sentences : []) {
    const text = String(sentence?.text ?? '').trim();
    const normalizedSentence = normalizeText(text);
    if (!text || seen.has(normalizedSentence)) continue;

    const terms = sentenceTerms(sentence);
    const keywords = new Set((Array.isArray(sentence?.keywords) ? sentence.keywords : []).map(normalizeWord));
    const focusMatches = terms.has(focus)
      || [...terms].some((term) => term.startsWith(focus) || focus.startsWith(term));
    if (!focusMatches) continue;

    seen.add(normalizedSentence);
    let score = clampPriority(sentence.priority) * 12;

    if (keywords.has(focus)) score += 4_500;
    else if (terms.has(focus)) score += 3_800;
    else score += 2_000;

    let matchedQueryTerms = 0;
    for (const term of normalizedQuery) {
      if (keywords.has(term)) {
        score += 700;
        matchedQueryTerms += 1;
      } else if (terms.has(term)) {
        score += 480;
        matchedQueryTerms += 1;
      } else if ([...terms].some((candidate) => candidate.startsWith(term) || term.startsWith(candidate))) {
        score += 180;
        matchedQueryTerms += 1;
      }
    }

    score += matchedQueryTerms * matchedQueryTerms * 80;
    score += usageBonus(usage[sentence.id]);
    score -= Math.max(0, text.length - 80) * 0.5;

    results.push({ ...sentence, text, normalized: normalizedSentence, score });
  }

  return results
    .sort((a, b) => b.score - a.score
      || a.text.length - b.text.length
      || a.text.localeCompare(b.text, DANISH_LOCALE))
    .slice(0, Math.max(1, Number(limit) || 5));
}

function sanitizeWord(entry) {
  const text = cleanDisplayWord(entry?.text ?? entry?.word ?? entry?.ord ?? '');
  if (!text) return null;
  return {
    id: String(entry?.id || createId('word')),
    text,
    priority: clampPriority(entry?.priority ?? entry?.prioritet),
  };
}

function sanitizeSentence(entry) {
  const text = String(entry?.text ?? entry?.sentence ?? entry?.saetning ?? entry?.sætning ?? '').trim();
  if (!text) return null;

  let keywords = entry?.keywords ?? entry?.stikord ?? [];
  if (typeof keywords === 'string') {
    keywords = keywords.split(/[|,;]/u);
  }
  keywords = unique((Array.isArray(keywords) ? keywords : [])
    .map(normalizeWord)
    .filter(Boolean));
  if (keywords.length === 0) keywords = deriveKeywords(text);

  return {
    id: String(entry?.id || createId('sentence')),
    text,
    keywords,
    priority: clampPriority(entry?.priority ?? entry?.prioritet),
  };
}

export function sanitizeData(rawData) {
  const raw = rawData && typeof rawData === 'object' ? rawData : {};
  const words = [];
  const sentences = [];
  const seenWords = new Set();
  const seenSentences = new Set();

  for (const entry of Array.isArray(raw.words) ? raw.words : []) {
    const word = sanitizeWord(entry);
    if (!word) continue;
    const key = normalizeWord(word.text);
    if (seenWords.has(key)) continue;
    seenWords.add(key);
    words.push(word);
  }

  for (const entry of Array.isArray(raw.sentences) ? raw.sentences : []) {
    const sentence = sanitizeSentence(entry);
    if (!sentence) continue;
    const key = normalizeText(sentence.text);
    if (seenSentences.has(key)) continue;
    seenSentences.add(key);
    sentences.push(sentence);

    for (const displayTerm of [...tokenizeDisplay(sentence.text), ...sentence.keywords]) {
      const normalizedTerm = normalizeWord(displayTerm);
      if (normalizedTerm.length < 2 || seenWords.has(normalizedTerm)) continue;
      seenWords.add(normalizedTerm);
      words.push({ id: createId('word'), text: displayTerm, priority: 50 });
    }
  }

  return {
    schemaVersion: 1,
    appVersion: String(raw.appVersion ?? '0.1.0'),
    words,
    sentences,
  };
}

export function mergeData(baseData, incomingData, options = {}) {
  const base = sanitizeData(baseData);
  const incoming = sanitizeData(incomingData);
  const replaceWords = Boolean(options.replaceWords);
  const replaceSentences = Boolean(options.replaceSentences);

  const wordMap = new Map();
  const sentenceMap = new Map();

  for (const word of replaceWords ? [] : base.words) {
    wordMap.set(normalizeWord(word.text), word);
  }
  for (const word of incoming.words) {
    const key = normalizeWord(word.text);
    const existing = wordMap.get(key);
    wordMap.set(key, existing
      ? { ...existing, priority: Math.max(existing.priority, word.priority) }
      : word);
  }

  for (const sentence of replaceSentences ? [] : base.sentences) {
    sentenceMap.set(normalizeText(sentence.text), sentence);
  }
  for (const sentence of incoming.sentences) {
    const key = normalizeText(sentence.text);
    const existing = sentenceMap.get(key);
    sentenceMap.set(key, existing
      ? {
          ...existing,
          priority: Math.max(existing.priority, sentence.priority),
          keywords: unique([...existing.keywords, ...sentence.keywords]),
        }
      : sentence);
  }

  return sanitizeData({
    schemaVersion: 1,
    appVersion: incoming.appVersion || base.appVersion,
    words: [...wordMap.values()],
    sentences: [...sentenceMap.values()],
  });
}

export function detectDelimiter(text) {
  const firstNonEmptyLine = String(text ?? '')
    .replace(/^\uFEFF/u, '')
    .split(/\r?\n/u)
    .find((line) => line.trim()) ?? '';

  const candidates = [';', '\t', ','];
  let best = ';';
  let bestCount = -1;

  for (const delimiter of candidates) {
    let count = 0;
    let inQuotes = false;
    for (let index = 0; index < firstNonEmptyLine.length; index += 1) {
      const character = firstNonEmptyLine[index];
      if (character === '"') {
        if (inQuotes && firstNonEmptyLine[index + 1] === '"') {
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (!inQuotes && character === delimiter) {
        count += 1;
      }
    }
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }

  return best;
}

export function parseDelimited(text, delimiter = detectDelimiter(text)) {
  const source = String(text ?? '').replace(/^\uFEFF/u, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (inQuotes) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      inQuotes = true;
    } else if (character === delimiter) {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/u, ''));
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  row.push(field.replace(/\r$/u, ''));
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  return rows;
}

function normalizeHeader(header) {
  return normalizeText(header)
    .replace(/æ/gu, 'ae')
    .replace(/ø/gu, 'oe')
    .replace(/å/gu, 'aa')
    .replace(/[^a-z0-9]/gu, '');
}

export function dataFromCSV(text) {
  const rows = parseDelimited(text);
  if (rows.length < 2) throw new Error('CSV-filen indeholder ingen datarækker.');

  const headers = rows[0].map(normalizeHeader);
  const findHeader = (...names) => headers.findIndex((header) => names.includes(header));
  const wordIndex = findHeader('ord', 'word');
  const sentenceIndex = findHeader('saetning', 'sentence', 'tekst', 'text');
  const priorityIndex = findHeader('prioritet', 'priority');
  const keywordsIndex = findHeader('stikord', 'keywords', 'noegleord', 'nogleord');

  if (wordIndex < 0 && sentenceIndex < 0) {
    throw new Error('CSV-filen skal have en kolonne med overskriften "ord" eller "sætning".');
  }

  if (sentenceIndex >= 0) {
    const sentences = rows.slice(1).map((row) => sanitizeSentence({
      text: row[sentenceIndex],
      keywords: keywordsIndex >= 0 ? row[keywordsIndex] : '',
      priority: priorityIndex >= 0 ? row[priorityIndex] : 50,
    })).filter(Boolean);
    return { kind: 'sentences', data: sanitizeData({ words: [], sentences }) };
  }

  const words = rows.slice(1).map((row) => sanitizeWord({
    text: row[wordIndex],
    priority: priorityIndex >= 0 ? row[priorityIndex] : 50,
  })).filter(Boolean);
  return { kind: 'words', data: sanitizeData({ words, sentences: [] }) };
}

function escapeDelimited(value, delimiter) {
  const text = String(value ?? '');
  if (text.includes('"') || text.includes('\n') || text.includes('\r') || text.includes(delimiter)) {
    return `"${text.replace(/"/gu, '""')}"`;
  }
  return text;
}

export function rowsToDelimited(rows, delimiter = ';') {
  return rows
    .map((row) => row.map((value) => escapeDelimited(value, delimiter)).join(delimiter))
    .join('\r\n');
}

export function wordsToCSV(words) {
  const rows = [['ord', 'prioritet']];
  for (const word of [...(Array.isArray(words) ? words : [])]
    .sort((a, b) => normalizeWord(a.text).localeCompare(normalizeWord(b.text), DANISH_LOCALE))) {
    rows.push([word.text, clampPriority(word.priority)]);
  }
  return `\uFEFF${rowsToDelimited(rows)}`;
}

export function sentencesToCSV(sentences) {
  const rows = [['sætning', 'stikord', 'prioritet']];
  for (const sentence of [...(Array.isArray(sentences) ? sentences : [])]
    .sort((a, b) => a.text.localeCompare(b.text, DANISH_LOCALE))) {
    rows.push([
      sentence.text,
      (Array.isArray(sentence.keywords) ? sentence.keywords : []).join('|'),
      clampPriority(sentence.priority),
    ]);
  }
  return `\uFEFF${rowsToDelimited(rows)}`;
}
