/**
 * Small, local Danish next-word model. No network calls or generated sentences.
 * The general data are built separately from COR and a documented text corpus.
 * Scores are ranking scores, NOT calibrated probabilities.
 */
const OWN = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);
const SEP = '\u001f';
const WORD_RE = /[\p{L}\p{M}][\p{L}\p{M}'\u2019-]*/gu;
const norm = (value) => String(value ?? '').normalize('NFKC').toLocaleLowerCase('da-DK').replace(/\u2019/gu, "'");
const words = (value) => (norm(value).match(WORD_RE) ?? []);
const log = (value) => Math.log1p(Math.max(0, Number(value) || 0));

function lowerBound(array, value) {
  let lo = 0; let hi = array.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (array[mid] < value) lo = mid + 1; else hi = mid;
  }
  return lo;
}

/** Longest suffix matching, with explicit shorter-context backoff candidates. */
export function statisticalCandidates(model, context, prefix = '') {
  const found = new Map();
  for (let size = Math.min(3, context.length); size >= 1; size -= 1) {
    const key = context.slice(-size).join(SEP);
    const row = OWN(model.contexts, key) ? model.contexts[key] : [];
    const total = row.reduce((sum, [, count]) => sum + count, 0) || 1;
    for (const [word, count] of row) {
      if (prefix && !word.startsWith(prefix)) continue;
      const score = size * 10000 + (count / total) * 5000 + log(count);
      if (!found.has(word) || found.get(word).score < score) {
        found.set(word, { word, display: word, score, source: 'corpus', contextSize: size });
      }
    }
  }
  return found;
}

export function parseInput(text, caret = String(text).length) {
  const value = String(text ?? '');
  const pos = Math.max(0, Math.min(value.length, Number(caret) || 0));
  const before = value.slice(0, pos);
  const prefix = before.match(/[\p{L}\p{M}'\u2019-]+$/u)?.[0] ?? '';
  const suffix = value.slice(pos).match(/^[\p{L}\p{M}'\u2019-]+/u)?.[0] ?? '';
  const start = pos - prefix.length;
  // Do not carry context across a sentence, a line break or a number.
  const segment = value.slice(0, start).split(/[.!?\n\r\d]+/u).at(-1) ?? '';
  return { value, caret: pos, prefix: norm(prefix), rawPrefix: prefix,
    start, end: pos + suffix.length, suffix, context: words(segment).slice(-3) };
}


function sortResults(items) {
  return items.sort((a, b) => b.score - a.score
    || a.word.length - b.word.length || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0));
}

export class DanishPredictor {
  constructor(data) {
    if (data?.format !== 'samtalestotte-language-model' || data.schemaVersion !== 1) {
      throw new Error('Ukendt format for sprogmodel.');
    }
    if (!Array.isArray(data.lexicon) || !data.contexts || !data.frequencies) {
      throw new Error('Sprogmodellen mangler ordbog eller kontekster.');
    }
    this.data = data;
    this.lexicon = [...new Set(data.lexicon.map(norm))].sort();
    this.frequencyWords = Object.keys(data.frequencies).sort((a, b) =>
      data.frequencies[b] - data.frequencies[a] || a.length - b.length || (a < b ? -1 : 1));
    this.prefixCache = new Map();
    this.personalWords = new Map();
    this.personalContexts = new Map();
  }

  hasWord(word) {
    const key = norm(word);
    return this.personalWords.has(key) || this.lexicon[lowerBound(this.lexicon, key)] === key;
  }

  setPersonal(data = {}) {
    this.personalWords.clear();
    this.personalContexts.clear();
    for (const entry of data.words ?? []) {
      const display = String(entry.text ?? '').trim();
      if (!display) continue;
      this.personalWords.set(norm(display), { display, priority: Number(entry.priority) || 50 });
    }
    for (const sentence of data.sentences ?? []) {
      // Preserve names in the user's own bank. Do not store raw general-corpus sentences.
      const display = String(sentence.text ?? '').normalize('NFKC').match(WORD_RE) ?? [];
      const terms = display.map(norm);
      for (let i = 0; i < terms.length; i += 1) {
        if (!this.personalWords.has(terms[i])) {
          this.personalWords.set(terms[i], { display: display[i], priority: 50 });
        }
        for (let size = 1; size <= Math.min(i, 3); size += 1) {
          const key = terms.slice(i - size, i).join(SEP);
          if (!this.personalContexts.has(key)) this.personalContexts.set(key, new Map());
          const row = this.personalContexts.get(key);
          const existing = row.get(terms[i]) ?? { display: display[i], count: 0, priority: 50 };
          existing.count += 1;
          existing.priority = Math.max(existing.priority, Number(sentence.priority) || 50);
          row.set(terms[i], existing);
        }
      }
    }
  }

  dictionaryCandidates(prefix) {
    if (!prefix) return this.frequencyWords.slice(0, 24);
    if (this.prefixCache.has(prefix)) return this.prefixCache.get(prefix);
    const top = [];
    for (let i = lowerBound(this.lexicon, prefix); i < this.lexicon.length; i += 1) {
      const word = this.lexicon[i];
      if (!word.startsWith(prefix)) break;
      if (word !== prefix) top.push(word);
    }
    top.sort((a, b) => (this.data.frequencies[b] || 0) - (this.data.frequencies[a] || 0)
      || a.length - b.length || (a < b ? -1 : 1));
    const result = top.slice(0, 32);
    if (this.prefixCache.size > 256) this.prefixCache.clear();
    this.prefixCache.set(prefix, result);
    return result;
  }

  candidates(context, prefix, usage = {}, usePersonal = true) {
    const found = statisticalCandidates(this.data, context, prefix);
    const add = (word, item) => {
      if (!found.has(word) || found.get(word).score < item.score) found.set(word, { word, ...item });
    };
    for (const word of this.dictionaryCandidates(prefix)) {
      if (prefix && word === prefix) continue;
      add(word, { display: word, score: 100 + log(this.data.frequencies[word]) * 25,
        source: 'dictionary', contextSize: 0 });
    }
    if (usePersonal) {
      for (let size = Math.min(3, context.length); size >= 1; size -= 1) {
        const key = context.slice(-size).join(SEP);
        const row = this.personalContexts.get(key);
        if (row) for (const [word, entry] of row) {
          if (prefix && !word.startsWith(prefix)) continue;
          add(word, { display: entry.display, score: size * 10000 + 6500
            + entry.priority * 5 + log(entry.count) * 100,
            source: 'personal', contextSize: size });
        }
        const learned = OWN(usage.contexts, key) ? usage.contexts[key] : {};
        for (const [word, stats] of Object.entries(learned ?? {})) {
          if ((prefix && !word.startsWith(prefix)) || !this.hasWord(word)) continue;
          const score = size * 10000 + 6800 + Math.min(2000, log(stats.count) * 400);
          add(word, { display: this.personalWords.get(word)?.display ?? word, score,
            source: 'learned', contextSize: size });
        }
      }
      if (prefix) for (const [word, entry] of this.personalWords) {
        if (word === prefix || !word.startsWith(prefix)) continue;
        const count = OWN(usage.words, word) ? usage.words[word]?.count : 0;
        add(word, { display: entry.display,
          score: 200 + entry.priority * 3 + log(count) * 100
            + log(this.data.frequencies[word]) * 25,
          source: 'personal-word', contextSize: 0 });
      }
      for (const [word, item] of found) {
        const stats = OWN(usage.words, word) ? usage.words[word] : null;
        item.score += Math.min(1200, log(stats?.count) * 100);
      }
    }
    return sortResults([...found.values()]);
  }

  predict(text, caret = String(text).length, usage = {}, limit = 3, usePersonal = true) {
    const info = parseInput(text, caret);
    if (!info.value.slice(0, info.caret).trim()) return [];
    const modes = [];
    if (!info.prefix) {
      // No automatic suggestions after a sentence terminator or after numbers.
      if (!info.context.length) return [];
      modes.push({ mode: 'next', prefix: '', context: info.context });
    } else {
      const exact = !info.suffix && info.prefix.length >= 3 && this.hasWord(info.prefix);
      if (exact) modes.push({ mode: 'next', prefix: '', context: [...info.context, info.prefix].slice(-3) });
      modes.push({ mode: 'complete', prefix: info.prefix, context: info.context });
    }
    const result = [];
    const seen = new Set();
    for (const spec of modes) {
      let candidates = this.candidates(spec.context, spec.prefix, usage, usePersonal);
      // When a word was not explicitly completed with a space, only infer "next"
      // from observed contexts. Never append arbitrary frequent words to a word
      // that merely happens to be a complete dictionary entry.
      if (spec.mode === 'next' && info.prefix) candidates = candidates.filter((x) => x.contextSize > 0);
      for (const candidate of candidates) {
        const key = `${spec.mode}:${candidate.word}`;
        if (seen.has(key) || (spec.mode === 'complete' && candidate.word === info.prefix)) continue;
        seen.add(key);
        let display = candidate.display;
        const currentUpper = info.rawPrefix && info.rawPrefix[0] !== info.rawPrefix[0].toLocaleLowerCase('da-DK');
        if (spec.mode === 'complete' && currentUpper) display = display[0].toLocaleUpperCase('da-DK') + display.slice(1);
        result.push({ kind: 'model', text: display, nextToken: candidate.word,
          mode: spec.mode, source: candidate.source, contextSize: candidate.contextSize,
          context: spec.context, replaceStart: spec.mode === 'complete' ? info.start : info.caret,
          replaceEnd: spec.mode === 'complete' ? info.end : info.caret,
          originalText: info.value, score: candidate.score });
        if (result.length >= limit) return result;
      }
    }
    return result;
  }
}

export function applyModelSuggestion(text, suggestion) {
  const value = String(text ?? '');
  if (suggestion?.kind !== 'model' || suggestion.originalText !== value) {
    throw new Error('Forslaget passer ikke l\u00e6ngere til teksten.');
  }
  const before = value.slice(0, suggestion.replaceStart);
  let after = value.slice(suggestion.replaceEnd);
  const leading = suggestion.mode === 'next' && before && !/\s$/u.test(before) ? ' ' : '';
  let trailing = '';
  if (/^ /u.test(after)) { after = after.replace(/^ +/u, ''); trailing = ' '; }
  else if (!after || !/^[,.;:!?)]/u.test(after)) trailing = ' ';
  const added = leading + suggestion.text + trailing;
  const output = before + added + after;
  return { text: output, selectionStart: before.length + added.length,
    selectionEnd: before.length + added.length };
}

/** Bounded local learning; caller includes the result in its existing backup. */
export function recordContextChoice(usage, context, nextWord, now = Date.now(), weight = 1) {
  const word = norm(nextWord);
  if (!word || !Array.isArray(context)) return;
  const normalizedContext = context.map(norm).filter(Boolean).slice(-3);
  if (!normalizedContext.length) return;
  if (!usage.contexts || typeof usage.contexts !== 'object') usage.contexts = {};
  // Learn the most specific available context only. This avoids a choice after
  // "stol er for" leaking into unrelated phrases such as "kaffen er for".
  const key = normalizedContext.join(SEP);
  const row = OWN(usage.contexts, key) ? usage.contexts[key] : {};
  const old = OWN(row, word) ? row[word] : {};
  const increment = Math.max(0.05, Math.min(4, Number(weight) || 1));
  row[word] = { count: Math.min(10000, (Number(old.count) || 0) + increment), lastUsed: now };
  usage.contexts[key] = row;
  const entries = Object.entries(row);
  if (entries.length > 8) {
    entries.sort((a, b) => b[1].lastUsed - a[1].lastUsed);
    usage.contexts[key] = Object.fromEntries(entries.slice(0, 8));
  }
  const keys = Object.keys(usage.contexts);
  if (keys.length > 300) {
    keys.sort((a, b) => Math.max(...Object.values(usage.contexts[b]).map((s) => s.lastUsed || 0))
      - Math.max(...Object.values(usage.contexts[a]).map((s) => s.lastUsed || 0)));
    usage.contexts = Object.fromEntries(keys.slice(0, 300).map((key) => [key, usage.contexts[key]]));
  }
}
