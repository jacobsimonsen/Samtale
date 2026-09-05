import { DEFAULT_DATA } from './default-data.js';
import {
  clampPriority,
  createId,
  dataFromCSV,
  deriveKeywords,
  mergeData,
  normalizeText,
  normalizeWord,
  rankSentenceSuggestions,
  rankWordSuggestions,
  replaceCurrentToken,
  sanitizeData,
  sentencesToCSV,
  tokenize,
  unique,
  wordsToCSV,
} from './lib.js';

const APP_VERSION = '0.1.0';
const STORAGE_KEYS = {
  data: 'samtalestotte.data.v1',
  settings: 'samtalestotte.settings.v1',
  usage: 'samtalestotte.usage.v1',
  draft: 'samtalestotte.draft.v1',
};

const DEFAULT_SETTINGS = {
  wordSuggestionCount: 6,
  sentenceSuggestionCount: 5,
  messageFontSize: 48,
};

const elements = {};
const state = {
  data: sanitizeData(structuredCloneSafe(DEFAULT_DATA)),
  settings: { ...DEFAULT_SETTINGS },
  usage: { words: {}, sentences: {} },
  wordSuggestions: [],
  sentenceSuggestions: [],
  focusTerm: '',
  suppressSentenceSuggestions: false,
  previousMessage: '',
  isComposing: false,
  saveTimer: null,
  pendingSave: { data: false, settings: false, usage: false, draft: false },
  toastTimer: null,
};

function structuredCloneSafe(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function byId(id) {
  return document.getElementById(id);
}

function collectElements() {
  Object.assign(elements, {
    message: byId('message'),
    clearMessage: byId('clear-message'),
    wordPanel: byId('word-panel'),
    wordContext: byId('word-context'),
    wordSuggestions: byId('word-suggestions'),
    sentencePanel: byId('sentence-panel'),
    sentenceContext: byId('sentence-context'),
    sentenceSuggestions: byId('sentence-suggestions'),
    emptyGuidance: byId('empty-guidance'),
    connectionStatus: byId('connection-status'),
    saveStatus: byId('save-status'),
    toast: byId('toast'),
    wordForm: byId('word-form'),
    wordEditId: byId('word-edit-id'),
    wordText: byId('word-text'),
    wordPriority: byId('word-priority'),
    cancelWordEdit: byId('cancel-word-edit'),
    wordFilter: byId('word-filter'),
    wordList: byId('word-list'),
    wordCount: byId('word-count'),
    sentenceForm: byId('sentence-form'),
    sentenceEditId: byId('sentence-edit-id'),
    sentenceText: byId('sentence-text'),
    sentenceKeywords: byId('sentence-keywords'),
    sentencePriority: byId('sentence-priority'),
    cancelSentenceEdit: byId('cancel-sentence-edit'),
    sentenceFilter: byId('sentence-filter'),
    sentenceList: byId('sentence-list'),
    sentenceCount: byId('sentence-count'),
    exportJson: byId('export-json'),
    exportWordsCsv: byId('export-words-csv'),
    exportSentencesCsv: byId('export-sentences-csv'),
    importMode: byId('import-mode'),
    importFile: byId('import-file'),
    importButton: byId('import-button'),
    importResult: byId('import-result'),
    settingsForm: byId('settings-form'),
    wordSuggestionCount: byId('word-suggestion-count'),
    sentenceSuggestionCount: byId('sentence-suggestion-count'),
    messageFontSize: byId('message-font-size'),
    messageFontSizeOutput: byId('message-font-size-output'),
    resetData: byId('reset-data'),
  });
}

function safeReadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Kunne ikke læse ${key}`, error);
    return fallback;
  }
}

function safeWriteStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Kunne ikke gemme ${key}`, error);
    showToast('Kunne ikke gemme lokalt. Eksportér en backupfil.', 5000);
    return false;
  }
}

function loadState() {
  const storedData = safeReadStorage(STORAGE_KEYS.data, null);
  const storedSettings = safeReadStorage(STORAGE_KEYS.settings, null);
  const storedUsage = safeReadStorage(STORAGE_KEYS.usage, null);
  const storedDraft = safeReadStorage(STORAGE_KEYS.draft, '');

  if (storedData) state.data = sanitizeData(storedData);
  state.settings = {
    ...DEFAULT_SETTINGS,
    ...(storedSettings && typeof storedSettings === 'object' ? storedSettings : {}),
  };
  state.settings.wordSuggestionCount = Math.max(3, Math.min(12, Number(state.settings.wordSuggestionCount) || 6));
  state.settings.sentenceSuggestionCount = Math.max(2, Math.min(10, Number(state.settings.sentenceSuggestionCount) || 5));
  state.settings.messageFontSize = Math.max(32, Math.min(72, Number(state.settings.messageFontSize) || 48));

  if (storedUsage && typeof storedUsage === 'object') {
    state.usage = {
      words: storedUsage.words && typeof storedUsage.words === 'object' ? storedUsage.words : {},
      sentences: storedUsage.sentences && typeof storedUsage.sentences === 'object' ? storedUsage.sentences : {},
    };
  }

  elements.message.value = typeof storedDraft === 'string' ? storedDraft : '';
}

function queueSave({ data = false, settings = false, usage = false, draft = false } = {}) {
  state.pendingSave.data = state.pendingSave.data || data;
  state.pendingSave.settings = state.pendingSave.settings || settings;
  state.pendingSave.usage = state.pendingSave.usage || usage;
  state.pendingSave.draft = state.pendingSave.draft || draft;

  window.clearTimeout(state.saveTimer);
  elements.saveStatus.textContent = 'Gemmer…';
  state.saveTimer = window.setTimeout(() => {
    const pending = { ...state.pendingSave };
    state.pendingSave = { data: false, settings: false, usage: false, draft: false };

    let okay = true;
    if (pending.data) okay = safeWriteStorage(STORAGE_KEYS.data, state.data) && okay;
    if (pending.settings) okay = safeWriteStorage(STORAGE_KEYS.settings, state.settings) && okay;
    if (pending.usage) okay = safeWriteStorage(STORAGE_KEYS.usage, state.usage) && okay;
    if (pending.draft) okay = safeWriteStorage(STORAGE_KEYS.draft, elements.message.value) && okay;
    elements.saveStatus.textContent = okay ? 'Gemt lokalt' : 'Ikke gemt';
  }, 120);
}

function showToast(message, duration = 2600) {
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  state.toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, duration);
}

function updateConnectionStatus() {
  const online = navigator.onLine;
  elements.connectionStatus.textContent = online ? 'Online · virker også offline' : 'Offline';
  elements.connectionStatus.classList.toggle('is-online', online);
  elements.connectionStatus.classList.toggle('is-offline', !online);
}

function applySettingsToUI() {
  document.documentElement.style.setProperty('--message-font-size', `${state.settings.messageFontSize}px`);
  elements.wordSuggestionCount.value = String(state.settings.wordSuggestionCount);
  elements.sentenceSuggestionCount.value = String(state.settings.sentenceSuggestionCount);
  elements.messageFontSize.value = String(state.settings.messageFontSize);
  elements.messageFontSizeOutput.value = `${state.settings.messageFontSize} px`;
  elements.messageFontSizeOutput.textContent = `${state.settings.messageFontSize} px`;
}

function setupNavigation() {
  const buttons = [...document.querySelectorAll('.nav-button')];
  const views = [...document.querySelectorAll('.view')];

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const target = button.dataset.view;
      for (const current of buttons) {
        const active = current === button;
        current.classList.toggle('is-active', active);
        if (active) current.setAttribute('aria-current', 'page');
        else current.removeAttribute('aria-current');
      }
      for (const view of views) {
        const active = view.id === `view-${target}`;
        view.hidden = !active;
        view.classList.toggle('is-active', active);
      }

      if (target === 'communicate') {
        window.requestAnimationFrame(() => elements.message.focus());
      } else if (target === 'edit') {
        renderEditors();
      } else if (target === 'data') {
        applySettingsToUI();
      }
    });
  }
}

function findExactWord(term) {
  const normalized = normalizeWord(term);
  return state.data.words.some((word) => normalizeWord(word.text) === normalized);
}

function determineFocusTerm(text, caret) {
  const beforeCaret = text.slice(0, caret);
  const tokens = tokenize(beforeCaret);
  if (tokens.length === 0) return '';

  const tokenMatch = beforeCaret.match(/[\p{L}\p{M}'’-]+$/u);
  if (tokenMatch) {
    const current = normalizeWord(tokenMatch[0]);
    if (findExactWord(current)) return current;
    if (state.focusTerm && tokens.includes(state.focusTerm)) return state.focusTerm;
    return '';
  }

  return tokens[tokens.length - 1] || state.focusTerm || '';
}

function renderSuggestions() {
  const text = elements.message.value;
  const caret = elements.message.selectionStart ?? text.length;
  const beforeCaret = text.slice(0, caret);
  const tokenMatch = beforeCaret.match(/[\p{L}\p{M}'’-]+$/u);
  const prefix = normalizeWord(tokenMatch?.[0] ?? '');

  state.wordSuggestions = rankWordSuggestions(
    state.data.words,
    prefix,
    state.usage.words,
    state.settings.wordSuggestionCount,
  );

  if (prefix && state.wordSuggestions.length > 0) {
    elements.wordPanel.hidden = false;
    elements.wordContext.textContent = `Forslag til “${tokenMatch[0]}”`;
    renderWordSuggestionButtons();
  } else {
    elements.wordPanel.hidden = true;
    elements.wordSuggestions.replaceChildren();
  }

  const focusTerm = determineFocusTerm(text, caret);
  if (!state.suppressSentenceSuggestions) state.focusTerm = focusTerm;
  const queryTerms = tokenize(beforeCaret);

  state.sentenceSuggestions = state.suppressSentenceSuggestions
    ? []
    : rankSentenceSuggestions(
      state.data.sentences,
      queryTerms,
      state.focusTerm,
      state.usage.sentences,
      state.settings.sentenceSuggestionCount,
    );

  if (state.focusTerm && state.sentenceSuggestions.length > 0) {
    elements.sentencePanel.hidden = false;
    elements.sentenceContext.textContent = `Indeholder “${state.focusTerm}”`;
    renderSentenceSuggestionButtons();
  } else {
    elements.sentencePanel.hidden = true;
    elements.sentenceSuggestions.replaceChildren();
  }

  elements.emptyGuidance.hidden = Boolean(text.trim() || state.wordSuggestions.length || state.sentenceSuggestions.length);
}

function renderWordSuggestionButtons() {
  const fragment = document.createDocumentFragment();
  state.wordSuggestions.forEach((suggestion, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'word-suggestion suggestion-control';
    button.dataset.kind = 'word';
    button.dataset.index = String(index);
    button.setAttribute('role', 'option');
    button.setAttribute('aria-label', `Indsæt ordet ${suggestion.text}`);
    button.textContent = suggestion.text;
    button.addEventListener('click', () => applyWordSuggestion(index));
    button.addEventListener('keydown', handleSuggestionKeydown);
    fragment.append(button);
  });
  elements.wordSuggestions.replaceChildren(fragment);
}

function appendHighlightedText(container, text, term) {
  const original = String(text);
  const normalizedOriginal = original.toLocaleLowerCase('da-DK');
  const normalizedTerm = normalizeWord(term);
  const index = normalizedTerm ? normalizedOriginal.indexOf(normalizedTerm) : -1;

  if (index < 0) {
    container.textContent = original;
    return;
  }

  container.append(document.createTextNode(original.slice(0, index)));
  const mark = document.createElement('mark');
  mark.textContent = original.slice(index, index + normalizedTerm.length);
  container.append(mark, document.createTextNode(original.slice(index + normalizedTerm.length)));
}

function renderSentenceSuggestionButtons() {
  const fragment = document.createDocumentFragment();
  state.sentenceSuggestions.forEach((suggestion, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sentence-suggestion suggestion-control';
    button.dataset.kind = 'sentence';
    button.dataset.index = String(index);
    button.setAttribute('role', 'option');
    button.setAttribute('aria-label', `Brug sætningen: ${suggestion.text}`);
    appendHighlightedText(button, suggestion.text, state.focusTerm);
    button.addEventListener('click', () => applySentenceSuggestion(index));
    button.addEventListener('keydown', handleSuggestionKeydown);
    fragment.append(button);
  });
  elements.sentenceSuggestions.replaceChildren(fragment);
}

function incrementUsage(group, key) {
  if (!key) return;
  const target = state.usage[group];
  const current = target[key] ?? { count: 0, lastUsed: 0 };
  target[key] = {
    count: (Number(current.count) || 0) + 1,
    lastUsed: Date.now(),
  };
  queueSave({ usage: true });
}

function applyWordSuggestion(index) {
  const suggestion = state.wordSuggestions[index];
  if (!suggestion) return;

  const result = replaceCurrentToken(
    elements.message.value,
    elements.message.selectionStart ?? elements.message.value.length,
    suggestion.text,
    true,
  );

  state.previousMessage = elements.message.value;
  state.focusTerm = normalizeWord(suggestion.text);
  state.suppressSentenceSuggestions = false;
  elements.message.value = result.text;
  elements.message.focus();
  elements.message.setSelectionRange(result.selectionStart, result.selectionEnd);
  incrementUsage('words', state.focusTerm);
  queueSave({ draft: true });
  renderSuggestions();
}

function applySentenceSuggestion(index) {
  const suggestion = state.sentenceSuggestions[index];
  if (!suggestion) return;

  state.previousMessage = elements.message.value;
  elements.message.value = suggestion.text;
  elements.message.focus();
  elements.message.setSelectionRange(suggestion.text.length, suggestion.text.length);
  state.focusTerm = '';
  state.suppressSentenceSuggestions = true;
  incrementUsage('sentences', suggestion.id);
  for (const term of tokenize(suggestion.text)) incrementUsage('words', term);
  queueSave({ draft: true });
  renderSuggestions();
  showToast('Sætningen er indsat');
}

function focusSuggestion(container, index = 0) {
  const controls = [...container.querySelectorAll('.suggestion-control')];
  if (controls.length === 0) return false;
  const target = controls[Math.max(0, Math.min(index, controls.length - 1))];
  target.focus();
  return true;
}

function handleSuggestionKeydown(event) {
  const controls = [...document.querySelectorAll('.suggestion-control:not([hidden])')];
  const currentIndex = controls.indexOf(event.currentTarget);
  if (currentIndex < 0) return;

  let nextIndex = currentIndex;
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') nextIndex = Math.min(controls.length - 1, currentIndex + 1);
  else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') nextIndex = Math.max(0, currentIndex - 1);
  else if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = controls.length - 1;
  else if (event.key === 'Escape') {
    event.preventDefault();
    elements.message.focus();
    return;
  } else {
    return;
  }

  event.preventDefault();
  controls[nextIndex].focus();
}

function setupComposer() {
  elements.message.addEventListener('compositionstart', () => {
    state.isComposing = true;
  });
  elements.message.addEventListener('compositionend', () => {
    state.isComposing = false;
    state.suppressSentenceSuggestions = false;
    queueSave({ draft: true });
    renderSuggestions();
  });

  elements.message.addEventListener('input', () => {
    if (state.isComposing) return;
    state.suppressSentenceSuggestions = false;
    if (elements.message.value) elements.clearMessage.textContent = 'Ryd tekst';
    queueSave({ draft: true });
    renderSuggestions();
  });

  elements.message.addEventListener('click', renderSuggestions);
  elements.message.addEventListener('keyup', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) renderSuggestions();
  });

  elements.message.addEventListener('keydown', (event) => {
    if (state.isComposing) return;

    if (event.key === 'Tab' && !event.shiftKey && state.wordSuggestions.length > 0) {
      event.preventDefault();
      applyWordSuggestion(0);
      return;
    }

    if (event.key === 'ArrowDown') {
      if (!elements.wordPanel.hidden && focusSuggestion(elements.wordSuggestions, 0)) {
        event.preventDefault();
        return;
      }
      if (!elements.sentencePanel.hidden && focusSuggestion(elements.sentenceSuggestions, 0)) {
        event.preventDefault();
      }
    }
  });

  elements.clearMessage.addEventListener('click', () => {
    if (elements.message.value) {
      state.previousMessage = elements.message.value;
      elements.message.value = '';
      elements.clearMessage.textContent = 'Gendan tekst';
      state.focusTerm = '';
      state.suppressSentenceSuggestions = false;
      queueSave({ draft: true });
      renderSuggestions();
      elements.message.focus();
      showToast('Teksten er ryddet');
    } else if (state.previousMessage) {
      elements.message.value = state.previousMessage;
      state.previousMessage = '';
      elements.clearMessage.textContent = 'Ryd tekst';
      queueSave({ draft: true });
      renderSuggestions();
      elements.message.focus();
      elements.message.setSelectionRange(elements.message.value.length, elements.message.value.length);
    }
  });
}

function renderEditors() {
  renderWordList();
  renderSentenceList();
}

function renderWordList() {
  const filter = normalizeWord(elements.wordFilter.value);
  const sorted = [...state.data.words]
    .filter((word) => !filter || normalizeWord(word.text).includes(filter))
    .sort((a, b) => a.text.localeCompare(b.text, 'da-DK'));
  const visible = sorted.slice(0, 250);

  elements.wordCount.textContent = `${state.data.words.length} ord`;
  const fragment = document.createDocumentFragment();

  if (visible.length === 0) {
    const paragraph = document.createElement('p');
    paragraph.className = 'empty-list';
    paragraph.textContent = 'Ingen ord matcher søgningen.';
    fragment.append(paragraph);
  }

  for (const word of visible) {
    const item = document.createElement('article');
    item.className = 'editable-item';
    item.dataset.id = word.id;

    const main = document.createElement('div');
    main.className = 'editable-item-main';
    const title = document.createElement('p');
    title.className = 'editable-item-title';
    title.textContent = word.text;
    const meta = document.createElement('p');
    meta.className = 'editable-item-meta';
    meta.textContent = `Prioritet ${word.priority}`;
    main.append(title, meta);

    const actions = document.createElement('div');
    actions.className = 'editable-item-actions';
    actions.append(
      makeSmallButton('Redigér', 'edit-word', word.id),
      makeSmallButton('Slet', 'delete-word', word.id, true),
    );
    item.append(main, actions);
    fragment.append(item);
  }

  if (sorted.length > visible.length) {
    const paragraph = document.createElement('p');
    paragraph.className = 'empty-list';
    paragraph.textContent = `Viser de første ${visible.length} resultater. Brug søgefeltet for at afgrænse listen.`;
    fragment.append(paragraph);
  }

  elements.wordList.replaceChildren(fragment);
}

function renderSentenceList() {
  const filter = normalizeText(elements.sentenceFilter.value);
  const sorted = [...state.data.sentences]
    .filter((sentence) => {
      const searchable = normalizeText(`${sentence.text} ${sentence.keywords.join(' ')}`);
      return !filter || searchable.includes(filter);
    })
    .sort((a, b) => b.priority - a.priority || a.text.localeCompare(b.text, 'da-DK'));

  elements.sentenceCount.textContent = `${state.data.sentences.length} sætninger`;
  const fragment = document.createDocumentFragment();

  if (sorted.length === 0) {
    const paragraph = document.createElement('p');
    paragraph.className = 'empty-list';
    paragraph.textContent = 'Ingen sætninger matcher søgningen.';
    fragment.append(paragraph);
  }

  for (const sentence of sorted.slice(0, 250)) {
    const item = document.createElement('article');
    item.className = 'editable-item';
    item.dataset.id = sentence.id;

    const main = document.createElement('div');
    main.className = 'editable-item-main';
    const title = document.createElement('p');
    title.className = 'editable-item-title';
    title.textContent = sentence.text;
    const meta = document.createElement('p');
    meta.className = 'editable-item-meta';
    meta.textContent = `Stikord: ${sentence.keywords.join(', ') || 'automatisk'} · Prioritet ${sentence.priority}`;
    main.append(title, meta);

    const actions = document.createElement('div');
    actions.className = 'editable-item-actions';
    actions.append(
      makeSmallButton('Redigér', 'edit-sentence', sentence.id),
      makeSmallButton('Slet', 'delete-sentence', sentence.id, true),
    );
    item.append(main, actions);
    fragment.append(item);
  }

  elements.sentenceList.replaceChildren(fragment);
}

function makeSmallButton(label, action, id, danger = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `small-button${danger ? ' is-danger' : ''}`;
  button.dataset.action = action;
  button.dataset.id = id;
  button.textContent = label;
  return button;
}

function resetWordForm() {
  elements.wordForm.reset();
  elements.wordEditId.value = '';
  elements.wordPriority.value = '50';
  elements.cancelWordEdit.hidden = true;
}

function resetSentenceForm() {
  elements.sentenceForm.reset();
  elements.sentenceEditId.value = '';
  elements.sentencePriority.value = '50';
  elements.cancelSentenceEdit.hidden = true;
}

function setupEditors() {
  elements.wordForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = normalizeWord(elements.wordText.value);
    const priority = clampPriority(elements.wordPriority.value);
    const editId = elements.wordEditId.value;
    if (!text) return;

    const duplicate = state.data.words.find((word) => normalizeWord(word.text) === text && word.id !== editId);
    if (duplicate) {
      duplicate.priority = Math.max(duplicate.priority, priority);
      showToast('Ordet fandtes allerede; prioriteten er opdateret');
    } else if (editId) {
      const word = state.data.words.find((entry) => entry.id === editId);
      if (word) Object.assign(word, { text, priority });
    } else {
      state.data.words.push({ id: createId('word'), text, priority });
    }

    state.data = sanitizeData(state.data);
    queueSave({ data: true });
    resetWordForm();
    renderWordList();
    renderSuggestions();
  });

  elements.cancelWordEdit.addEventListener('click', resetWordForm);
  elements.wordFilter.addEventListener('input', renderWordList);
  elements.wordList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const word = state.data.words.find((entry) => entry.id === button.dataset.id);
    if (!word) return;

    if (button.dataset.action === 'edit-word') {
      elements.wordEditId.value = word.id;
      elements.wordText.value = word.text;
      elements.wordPriority.value = String(word.priority);
      elements.cancelWordEdit.hidden = false;
      elements.wordText.focus();
    } else if (button.dataset.action === 'delete-word') {
      if (!window.confirm(`Slet ordet “${word.text}”?`)) return;
      state.data.words = state.data.words.filter((entry) => entry.id !== word.id);
      queueSave({ data: true });
      renderWordList();
      renderSuggestions();
    }
  });

  elements.sentenceForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = elements.sentenceText.value.trim();
    const priority = clampPriority(elements.sentencePriority.value);
    const editId = elements.sentenceEditId.value;
    if (!text) return;

    let keywords = unique(elements.sentenceKeywords.value
      .split(/[|,;]/u)
      .map(normalizeWord)
      .filter(Boolean));
    if (keywords.length === 0) keywords = deriveKeywords(text);

    const duplicate = state.data.sentences.find((sentence) => normalizeText(sentence.text) === normalizeText(text) && sentence.id !== editId);
    if (duplicate) {
      duplicate.priority = Math.max(duplicate.priority, priority);
      duplicate.keywords = unique([...duplicate.keywords, ...keywords]);
      showToast('Sætningen fandtes allerede; data er opdateret');
    } else if (editId) {
      const sentence = state.data.sentences.find((entry) => entry.id === editId);
      if (sentence) Object.assign(sentence, { text, keywords, priority });
    } else {
      state.data.sentences.push({ id: createId('sentence'), text, keywords, priority });
    }

    state.data = sanitizeData(state.data);
    queueSave({ data: true });
    resetSentenceForm();
    renderEditors();
    renderSuggestions();
  });

  elements.cancelSentenceEdit.addEventListener('click', resetSentenceForm);
  elements.sentenceFilter.addEventListener('input', renderSentenceList);
  elements.sentenceList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const sentence = state.data.sentences.find((entry) => entry.id === button.dataset.id);
    if (!sentence) return;

    if (button.dataset.action === 'edit-sentence') {
      elements.sentenceEditId.value = sentence.id;
      elements.sentenceText.value = sentence.text;
      elements.sentenceKeywords.value = sentence.keywords.join(', ');
      elements.sentencePriority.value = String(sentence.priority);
      elements.cancelSentenceEdit.hidden = false;
      elements.sentenceText.focus();
    } else if (button.dataset.action === 'delete-sentence') {
      if (!window.confirm(`Slet sætningen “${sentence.text}”?`)) return;
      state.data.sentences = state.data.sentences.filter((entry) => entry.id !== sentence.id);
      queueSave({ data: true });
      renderSentenceList();
      renderSuggestions();
    }
  });
}

function downloadText(filename, text, mimeType) {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function datedFilename(base, extension) {
  const date = new Date().toISOString().slice(0, 10);
  return `${base}-${date}.${extension}`;
}

function setupDataTools() {
  elements.exportJson.addEventListener('click', () => {
    const backup = {
      format: 'samtalestotte-backup',
      schemaVersion: 1,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      data: state.data,
      settings: state.settings,
      usage: state.usage,
    };
    downloadText(
      datedFilename('samtalestotte-backup', 'json'),
      JSON.stringify(backup, null, 2),
      'application/json',
    );
  });

  elements.exportWordsCsv.addEventListener('click', () => {
    downloadText(datedFilename('samtalestotte-ord', 'csv'), wordsToCSV(state.data.words), 'text/csv');
  });

  elements.exportSentencesCsv.addEventListener('click', () => {
    downloadText(
      datedFilename('samtalestotte-saetninger', 'csv'),
      sentencesToCSV(state.data.sentences),
      'text/csv',
    );
  });

  elements.importButton.addEventListener('click', async () => {
    const file = elements.importFile.files?.[0];
    if (!file) {
      setImportResult('Vælg først en JSON- eller CSV-fil.', true);
      return;
    }

    try {
      const text = await file.text();
      const replace = elements.importMode.value === 'replace';
      const lowerName = file.name.toLocaleLowerCase('da-DK');

      if (lowerName.endsWith('.json') || file.type.includes('json')) {
        const parsed = JSON.parse(text);
        const incomingData = parsed?.data ?? parsed;
        if (!incomingData || !Array.isArray(incomingData.words) || !Array.isArray(incomingData.sentences)) {
          throw new Error('JSON-filen har ikke det forventede dataformat.');
        }

        state.data = replace
          ? sanitizeData(incomingData)
          : mergeData(state.data, incomingData);

        if (replace && parsed?.settings) {
          state.settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
          applySettingsToUI();
        }
        if (replace && parsed?.usage) {
          state.usage = {
            words: parsed.usage.words ?? {},
            sentences: parsed.usage.sentences ?? {},
          };
        }
      } else {
        const imported = dataFromCSV(text);
        state.data = mergeData(state.data, imported.data, {
          replaceWords: replace && imported.kind === 'words',
          replaceSentences: replace && imported.kind === 'sentences',
        });
      }

      queueSave({ data: true, settings: true, usage: true });
      renderEditors();
      renderSuggestions();
      setImportResult(`Import gennemført: ${state.data.words.length} ord og ${state.data.sentences.length} sætninger.`, false);
      elements.importFile.value = '';
    } catch (error) {
      console.error(error);
      setImportResult(error instanceof Error ? error.message : 'Filen kunne ikke importeres.', true);
    }
  });

  elements.messageFontSize.addEventListener('input', () => {
    elements.messageFontSizeOutput.value = `${elements.messageFontSize.value} px`;
    elements.messageFontSizeOutput.textContent = `${elements.messageFontSize.value} px`;
    document.documentElement.style.setProperty('--message-font-size', `${elements.messageFontSize.value}px`);
  });

  elements.settingsForm.addEventListener('submit', (event) => {
    event.preventDefault();
    state.settings = {
      wordSuggestionCount: Math.max(3, Math.min(12, Number(elements.wordSuggestionCount.value) || 6)),
      sentenceSuggestionCount: Math.max(2, Math.min(10, Number(elements.sentenceSuggestionCount.value) || 5)),
      messageFontSize: Math.max(32, Math.min(72, Number(elements.messageFontSize.value) || 48)),
    };
    applySettingsToUI();
    queueSave({ settings: true });
    renderSuggestions();
    showToast('Indstillingerne er gemt');
  });

  elements.resetData.addEventListener('click', () => {
    const confirmed = window.confirm('Nulstil ord og sætninger til demonstrationsdata? Lokale ændringer slettes.');
    if (!confirmed) return;
    state.data = sanitizeData(structuredCloneSafe(DEFAULT_DATA));
    state.usage = { words: {}, sentences: {} };
    queueSave({ data: true, usage: true });
    resetWordForm();
    resetSentenceForm();
    renderEditors();
    renderSuggestions();
    showToast('Testdata er gendannet');
  });
}

function setImportResult(message, isError) {
  elements.importResult.textContent = message;
  elements.importResult.classList.toggle('is-error', isError);
  elements.importResult.classList.toggle('is-success', !isError);
}

async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch (error) {
    console.info('Vedvarende lager kunne ikke anmodes om', error);
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (error) {
      console.warn('Service worker kunne ikke registreres', error);
    }
  });
}

function initialize() {
  collectElements();
  loadState();
  applySettingsToUI();
  setupNavigation();
  setupComposer();
  setupEditors();
  setupDataTools();
  renderEditors();
  renderSuggestions();
  updateConnectionStatus();
  window.addEventListener('online', updateConnectionStatus);
  window.addEventListener('offline', updateConnectionStatus);
  registerServiceWorker();
  requestPersistentStorage();
  window.requestAnimationFrame(() => elements.message.focus());
}

initialize();
