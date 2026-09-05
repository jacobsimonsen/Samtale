import { DanishPredictor, applyModelSuggestion, recordContextChoice } from './language-model.js?v=0.3.0-beta1';
import { DEFAULT_DATA } from './default-data.js?v=0.3.0-beta1';
import {
  applyContinuationSuggestion,
  clampPriority,
  createId,
  dataFromCSV,
  deriveKeywords,
  mergeData,
  normalizeText,
  normalizeWord,
  rankContinuationSuggestions,
  rankWholeSentenceSuggestions,
  sanitizeData,
  sentencesToCSV,
  tokenize,
  unique,
  wordsToCSV,
} from './lib.js?v=0.3.0-beta1';

const APP_VERSION = '0.3.0-beta1';
const STORAGE_KEYS = {
  data: 'samtalestotte.data.v1',
  settings: 'samtalestotte.settings.v1',
  usage: 'samtalestotte.usage.v1',
  draft: 'samtalestotte.draft.v1',
  snapshots: 'samtalestotte.snapshots.v2',
  backupMeta: 'samtalestotte.backup-meta.v2',
};

const DEFAULT_SETTINGS = {
  messageFontSize: 48,
  predictionEngine: 'v03',
};

const CONTINUATION_LIMIT = 3;
const SENTENCE_LIMIT = 3;
const SNAPSHOT_LIMIT = 30;
const EXTERNAL_BACKUP_REMINDER_DAYS = 7;

const elements = {};
const state = {
  data: sanitizeData(structuredCloneSafe(DEFAULT_DATA)),
  settings: { ...DEFAULT_SETTINGS },
  usage: { words: {}, sentences: {}, contexts: {} },
  predictor: null,
  composerSelection: null,
  wordSuggestions: [],
  sentenceSuggestions: [],
  snapshots: [],
  backupMeta: { lastExternalExport: 0 },
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
    modelStatus: byId('model-status'),
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
    snapshotStatus: byId('snapshot-status'),
    snapshotSelect: byId('snapshot-select'),
    restoreSnapshot: byId('restore-snapshot'),
    externalBackupReminder: byId('external-backup-reminder'),
    messageFontSize: byId('message-font-size'),
    messageFontSizeOutput: byId('message-font-size-output'),
    predictionEngine: byId('prediction-engine'),
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
  const storedSnapshots = safeReadStorage(STORAGE_KEYS.snapshots, []);
  const storedBackupMeta = safeReadStorage(STORAGE_KEYS.backupMeta, null);

  if (storedData) state.data = sanitizeData(storedData);
  state.settings = {
    ...DEFAULT_SETTINGS,
    ...(storedSettings && typeof storedSettings === 'object' ? storedSettings : {}),
  };
  state.settings.messageFontSize = Math.max(32, Math.min(72, Number(state.settings.messageFontSize) || 48));
  state.settings.predictionEngine = state.settings.predictionEngine === 'v02' ? 'v02' : 'v03';

  state.snapshots = Array.isArray(storedSnapshots) ? storedSnapshots.slice(-SNAPSHOT_LIMIT) : [];
  if (storedBackupMeta && typeof storedBackupMeta === 'object') {
    state.backupMeta = {
      lastExternalExport: Number(storedBackupMeta.lastExternalExport) || 0,
    };
  }

  if (storedUsage && typeof storedUsage === 'object') {
    state.usage = {
      words: storedUsage.words && typeof storedUsage.words === 'object' ? storedUsage.words : {},
      sentences: storedUsage.sentences && typeof storedUsage.sentences === 'object' ? storedUsage.sentences : {},
      contexts: storedUsage.contexts && typeof storedUsage.contexts === 'object' ? storedUsage.contexts : {},
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
  elements.connectionStatus.textContent = online ? 'Online' : 'Offline';
  elements.connectionStatus.classList.toggle('is-online', online);
  elements.connectionStatus.classList.toggle('is-offline', !online);
}

function applySettingsToUI() {
  document.documentElement.style.setProperty('--message-font-size', `${state.settings.messageFontSize}px`);
  elements.messageFontSize.value = String(state.settings.messageFontSize);
  elements.messageFontSizeOutput.value = `${state.settings.messageFontSize} px`;
  elements.messageFontSizeOutput.textContent = `${state.settings.messageFontSize} px`;
  if (elements.predictionEngine) elements.predictionEngine.value = state.settings.predictionEngine;
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

function renderSuggestions() {
  const text = elements.message.value;
  const caret = elements.message.selectionStart ?? text.length;
  const beforeCaret = text.slice(0, caret);

  const useNewEngine = state.settings.predictionEngine !== 'v02' && state.predictor;
  state.wordSuggestions = useNewEngine
    ? state.predictor.predict(text, caret, state.usage, CONTINUATION_LIMIT)
    : rankContinuationSuggestions(state.data.sentences, state.data.words,
      beforeCaret, state.usage, CONTINUATION_LIMIT);

  if (state.wordSuggestions.length > 0) {
    elements.wordPanel.hidden = false;
    elements.wordContext.textContent = 'Højst 3 forslag';
    renderWordSuggestionButtons();
  } else {
    elements.wordPanel.hidden = true;
    elements.wordSuggestions.replaceChildren();
  }

  state.sentenceSuggestions = rankWholeSentenceSuggestions(
    state.data.sentences,
    beforeCaret,
    state.usage.sentences,
    SENTENCE_LIMIT,
  );

  if (state.sentenceSuggestions.length > 0) {
    elements.sentencePanel.hidden = false;
    const hasCompletion = state.sentenceSuggestions.some((item) => item.isPrefixCompletion);
    elements.sentenceContext.textContent = hasCompletion ? 'Kan fuldføre din tekst' : 'Relevante hele sætninger';
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
    button.setAttribute('aria-label', `Fortsæt med ${suggestion.text}`);
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
    button.textContent = suggestion.text;
    if (suggestion.isPrefixCompletion) button.dataset.completion = 'true';
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

  let result;
  try {
    result = suggestion.kind === 'model'
      ? applyModelSuggestion(elements.message.value, suggestion)
      : applyContinuationSuggestion(elements.message.value,
        elements.message.selectionStart ?? elements.message.value.length, suggestion);
  } catch (error) {
    renderSuggestions();
    elements.message.focus();
    return;
  }
  if (suggestion.kind === 'model') {
    recordContextChoice(state.usage, suggestion.context, suggestion.nextToken);
  }

  state.previousMessage = elements.message.value;
  elements.message.value = result.text;
  elements.message.focus();
  elements.message.setSelectionRange(result.selectionStart, result.selectionEnd);
  if (suggestion.nextToken) incrementUsage('words', normalizeWord(suggestion.nextToken));
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
  incrementUsage('sentences', suggestion.id);
  for (const term of tokenize(suggestion.text)) incrementUsage('words', term);
  queueSave({ draft: true });
  renderSuggestions();
  showToast('Sætningen er indsat');
}

function focusSuggestion(container, index = 0) {
  state.composerSelection = [elements.message.selectionStart, elements.message.selectionEnd];
  const controls = [...container.querySelectorAll('.suggestion-control')];
  if (controls.length === 0) return false;
  const target = controls[Math.max(0, Math.min(index, controls.length - 1))];
  target.focus();
  return true;
}

function returnToComposer() {
  const selection = state.composerSelection ?? [elements.message.selectionStart, elements.message.selectionEnd];
  elements.message.focus();
  elements.message.setSelectionRange(selection[0], selection[1]);
  state.composerSelection = null;
}

function handleSuggestionKeydown(event) {
  const controls = [...document.querySelectorAll('.suggestion-control:not([hidden])')];
  const currentIndex = controls.indexOf(event.currentTarget);
  if (currentIndex < 0) return;

  if (event.key === 'Escape' || (event.key === 'ArrowUp' && currentIndex === 0)) {
    event.preventDefault();
    returnToComposer();
    return;
  }
  let nextIndex = currentIndex;
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') nextIndex = Math.min(controls.length - 1, currentIndex + 1);
  else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') nextIndex = Math.max(0, currentIndex - 1);
  else if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = controls.length - 1;
  else if (event.key === 'Escape') {
    event.preventDefault();
    returnToComposer();
    return;
  } else {
    return;
  }

  event.preventDefault();
  controls[nextIndex].focus();
}

function clearComposerText() {
  if (!elements.message.value) return false;
  learnFinalTypedWord();
  state.previousMessage = elements.message.value;
  elements.message.value = '';
  elements.clearMessage.textContent = 'Gendan tekst';
  queueSave({ draft: true });
  renderSuggestions();
  elements.message.focus();
  showToast('Teksten er ryddet');
  return true;
}

function restoreComposerText() {
  if (!state.previousMessage) return false;
  elements.message.value = state.previousMessage;
  state.previousMessage = '';
  elements.clearMessage.textContent = 'Ryd tekst';
  queueSave({ draft: true });
  renderSuggestions();
  elements.message.focus();
  elements.message.setSelectionRange(elements.message.value.length, elements.message.value.length);
  return true;
}

function scheduleTypedBoundaryLearning(event) {
  if (!state.predictor || state.settings.predictionEngine === 'v02') return;
  if (event?.inputType !== 'insertText' || typeof event.data !== 'string') return;
  if (!/[\s,.;:!?)]/u.test(event.data)) return;
  const text = elements.message.value;
  const caret = elements.message.selectionStart ?? text.length;
  const insertedLength = event.data.length;
  const insertionStart = Math.max(0, caret - insertedLength);
  // Multiple spaces/punctuation after an already completed token must not count twice.
  if (insertionStart <= 0 || !/[\p{L}\p{M}'’\-]/u.test(text[insertionStart - 1] ?? '')) return;
  const beforeBoundary = text.slice(0, insertionStart);
  const segment = beforeBoundary.split(/[.!?\n\r\d]+/u).at(-1) ?? '';
  const terms = tokenize(segment);
  if (terms.length < 2) return;
  const nextWord = terms.at(-1);
  const context = terms.slice(Math.max(0, terms.length - 4), -1);
  const fingerprint = text.slice(0, caret);
  // Give the user a short opportunity to correct the just-finished word. Continuing
  // after it does not cancel learning, but changing the captured prefix does.
  window.setTimeout(() => {
    if (!elements.message.value.startsWith(fingerprint)) return;
    recordContextChoice(state.usage, context, nextWord, Date.now(), 0.35);
    incrementUsage('words', normalizeWord(nextWord));
  }, 1000);
}

function learnFinalTypedWord() {
  if (!state.predictor || state.settings.predictionEngine === 'v02') return;
  const text = elements.message.value;
  if (!text || /[\s,.;:!?)]$/u.test(text)) return;
  const segment = text.split(/[.!?\n\r\d]+/u).at(-1) ?? '';
  const terms = tokenize(segment);
  if (terms.length < 2) return;
  const nextWord = terms.at(-1);
  const context = terms.slice(Math.max(0, terms.length - 4), -1);
  recordContextChoice(state.usage, context, nextWord, Date.now(), 0.2);
  incrementUsage('words', normalizeWord(nextWord));
}

function setupComposer() {
  elements.message.addEventListener('compositionstart', () => {
    state.isComposing = true;
  });
  elements.message.addEventListener('compositionend', () => {
    state.isComposing = false;
    queueSave({ draft: true });
    renderSuggestions();
  });

  elements.message.addEventListener('input', (event) => {
    if (state.isComposing) return;
    scheduleTypedBoundaryLearning(event);
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
    if (event.key === 'Escape' && event.repeat) { event.preventDefault(); return; }

    if (event.key === 'Escape' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (elements.message.value) {
        event.preventDefault();
        clearComposerText();
      }
      return;
    }

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
    if (elements.message.value) clearComposerText();
    else restoreComposerText();
  });
}

function renderEditors() {
  if (state.predictor) state.predictor.setPersonal(state.data);
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


function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createBackupPayload() {
  return {
    format: 'samtalestotte-backup',
    schemaVersion: 1,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data: state.data,
    settings: state.settings,
    usage: state.usage,
    draft: elements.message.value,
  };
}

function ensureDailySnapshot() {
  const today = localDateKey();
  const existing = state.snapshots.find((snapshot) => snapshot?.date === today);
  if (existing) return;

  const snapshot = {
    id: `snapshot-${today}`,
    date: today,
    createdAt: new Date().toISOString(),
    backup: structuredCloneSafe(createBackupPayload()),
  };
  state.snapshots = [...state.snapshots, snapshot]
    .filter((item) => item && item.date && item.backup)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(-SNAPSHOT_LIMIT);
  let copies = [...state.snapshots];
  while (copies.length) {
    try {
      localStorage.setItem(STORAGE_KEYS.snapshots, JSON.stringify(copies));
      state.snapshots = copies;
      break;
    } catch (error) {
      if (copies.length === 1) {
        showToast('Ikke plads til lokalt snapshot. Eksportér en backupfil.', 5000);
        break;
      }
      copies = copies.slice(1);
    }
  }
}

function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return 'ukendt tidspunkt';
  return new Intl.DateTimeFormat('da-DK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function renderBackupStatus() {
  const snapshots = [...state.snapshots].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  elements.snapshotSelect.replaceChildren();

  if (snapshots.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Ingen snapshots endnu';
    elements.snapshotSelect.append(option);
    elements.snapshotSelect.disabled = true;
    elements.restoreSnapshot.disabled = true;
    elements.snapshotStatus.textContent = 'Ingen automatiske snapshots endnu.';
  } else {
    elements.snapshotSelect.disabled = false;
    elements.restoreSnapshot.disabled = false;
    for (const snapshot of snapshots) {
      const option = document.createElement('option');
      option.value = snapshot.id;
      option.textContent = formatDateTime(snapshot.createdAt);
      elements.snapshotSelect.append(option);
    }
    const newest = snapshots[0];
    elements.snapshotStatus.textContent = `${snapshots.length} lokale snapshots · seneste ${formatDateTime(newest.createdAt)}.`;
  }

  const now = Date.now();
  const lastExport = Number(state.backupMeta.lastExternalExport) || 0;
  const oldestSnapshotTime = snapshots.length
    ? new Date(snapshots[snapshots.length - 1].createdAt).getTime()
    : now;
  const reminderAgeMs = EXTERNAL_BACKUP_REMINDER_DAYS * 24 * 60 * 60 * 1000;
  const shouldRemind = lastExport
    ? now - lastExport >= reminderAgeMs
    : snapshots.length > 0 && now - oldestSnapshotTime >= reminderAgeMs;

  elements.externalBackupReminder.hidden = !shouldRemind;
  if (shouldRemind) {
    const days = lastExport ? Math.floor((now - lastExport) / (24 * 60 * 60 * 1000)) : EXTERNAL_BACKUP_REMINDER_DAYS;
    elements.externalBackupReminder.textContent = lastExport
      ? `Det er ${days} dage siden sidste eksterne JSON-backup.`
      : 'Der er endnu ikke lavet en ekstern JSON-backup. De lokale snapshots ligger kun på denne enhed.';
  }
}

function restoreSnapshot(snapshot) {
  const backup = snapshot?.backup;
  if (!backup?.data) throw new Error('Snapshot mangler data.');
  state.data = sanitizeData(backup.data);
  state.settings = { ...DEFAULT_SETTINGS, ...(backup.settings ?? {}) };
  state.settings.messageFontSize = Math.max(32, Math.min(72, Number(state.settings.messageFontSize) || 48));
  state.settings.predictionEngine = state.settings.predictionEngine === 'v02' ? 'v02' : 'v03';
  state.usage = {
    words: backup.usage?.words ?? {},
    sentences: backup.usage?.sentences ?? {},
    contexts: backup.usage?.contexts ?? {},
  };
  elements.message.value = typeof backup.draft === 'string' ? backup.draft : '';
  safeWriteStorage(STORAGE_KEYS.data, state.data);
  safeWriteStorage(STORAGE_KEYS.settings, state.settings);
  safeWriteStorage(STORAGE_KEYS.usage, state.usage);
  safeWriteStorage(STORAGE_KEYS.draft, elements.message.value);
  applySettingsToUI();
  renderEditors();
  renderSuggestions();
}

function setupDataTools() {
  elements.exportJson.addEventListener('click', () => {
    const backup = createBackupPayload();
    downloadText(
      datedFilename('samtalestotte-backup', 'json'),
      JSON.stringify(backup, null, 2),
      'application/json',
    );
    state.backupMeta.lastExternalExport = Date.now();
    safeWriteStorage(STORAGE_KEYS.backupMeta, state.backupMeta);
    renderBackupStatus();
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

  elements.restoreSnapshot.addEventListener('click', () => {
    const snapshot = state.snapshots.find((item) => item.id === elements.snapshotSelect.value);
    if (!snapshot) return;
    const confirmed = window.confirm(`Gendan snapshot fra ${formatDateTime(snapshot.createdAt)}? Aktuelle lokale data erstattes.`);
    if (!confirmed) return;
    try {
      restoreSnapshot(snapshot);
      showToast('Snapshot er gendannet');
    } catch (error) {
      console.error(error);
      showToast('Snapshot kunne ikke gendannes', 5000);
    }
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
          state.settings.messageFontSize = Math.max(32, Math.min(72, Number(state.settings.messageFontSize) || 48));
          state.settings.predictionEngine = state.settings.predictionEngine === 'v02' ? 'v02' : 'v03';
          applySettingsToUI();
        }
        if (replace && parsed?.usage) {
          state.usage = {
            words: parsed.usage.words ?? {},
            sentences: parsed.usage.sentences ?? {},
            contexts: parsed.usage.contexts ?? {},
          };
        }
        if (replace && typeof parsed?.draft === 'string') {
          elements.message.value = parsed.draft;
          safeWriteStorage(STORAGE_KEYS.draft, elements.message.value);
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
      renderBackupStatus();
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
      messageFontSize: Math.max(32, Math.min(72, Number(elements.messageFontSize.value) || 48)),
      predictionEngine: elements.predictionEngine?.value === 'v02' ? 'v02' : 'v03',
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
    state.usage = { words: {}, sentences: {}, contexts: {} };
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
      await navigator.serviceWorker.register('./sw.js?v=0.3.0-beta1');
    } catch (error) {
      console.warn('Service worker kunne ikke registreres', error);
    }
  });
}


async function loadGeneralModel() {
  elements.modelStatus.textContent = 'Sprogmodel indlæses...';
  try {
    const response = await fetch('./language-data.json');
    if (!response.ok) throw new Error('Model ikke bygget');
    const data = await response.json();
    const testMode = ['localhost', '127.0.0.1'].includes(location.hostname)
      && new URLSearchParams(location.search).has('test-fixture');
    if (data.metadata?.fixture && !testMode) throw new Error('Kun syntetiske testdata');
    state.predictor = new DanishPredictor(data);
    state.predictor.setPersonal(state.data);
    const count = state.predictor.lexicon.length.toLocaleString('da-DK');
    elements.modelStatus.textContent = data.metadata?.fixture
      ? 'Syntetiske testdata - ikke en dansk sprogmodel'
      : `Dansk sprogmodel klar: ${count} ordformer`;
    if (state.settings.predictionEngine === 'v02') elements.modelStatus.textContent += ' (v0.2-motor valgt)';
    if (!document.activeElement?.classList.contains('suggestion-control')) renderSuggestions();
  } catch (error) {
    elements.modelStatus.textContent = 'Sprogmodel ikke klar - den enkle v0.2-motor bruges.';
    console.warn('Sprogmodel:', error.message);
  }
}

function initialize() {
  collectElements();
  loadState();
  applySettingsToUI();
  ensureDailySnapshot();
  setupNavigation();
  setupComposer();
  setupEditors();
  setupDataTools();
  renderEditors();
  renderSuggestions();
  renderBackupStatus();
  updateConnectionStatus();
  window.addEventListener('online', updateConnectionStatus);
  window.addEventListener('offline', updateConnectionStatus);
  registerServiceWorker();
  loadGeneralModel();
  requestPersistentStorage();
  window.requestAnimationFrame(() => elements.message.focus());
}

initialize();
