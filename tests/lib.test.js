import test from 'node:test';
import assert from 'node:assert/strict';

import {
  dataFromCSV,
  deriveKeywords,
  getCurrentTokenInfo,
  mergeData,
  parseDelimited,
  rankSentenceSuggestions,
  rankWordSuggestions,
  replaceCurrentToken,
  sanitizeData,
  sentencesToCSV,
  wordsToCSV,
} from '../lib.js';

test('finder det aktuelle ordpræfiks ved markøren', () => {
  assert.deepEqual(getCurrentTokenInfo('Jeg vil have ka', 15), {
    prefix: 'ka',
    rawPrefix: 'ka',
    start: 13,
    end: 15,
    caret: 15,
  });
});

test('ordforslag bruger præfiks og prioritet', () => {
  const words = [
    { id: '1', text: 'kaffe', priority: 100 },
    { id: '2', text: 'kage', priority: 90 },
    { id: '3', text: 'kan', priority: 80 },
    { id: '4', text: 'banan', priority: 100 },
  ];
  const suggestions = rankWordSuggestions(words, 'ka', {}, 3);
  assert.deepEqual(suggestions.map((item) => item.text), ['kaffe', 'kage', 'kan']);
});

test('indsætter et valgt ord og bevarer stort begyndelsesbogstav', () => {
  const result = replaceCurrentToken('Ka', 2, 'kaffe');
  assert.equal(result.text, 'Kaffe ');
  assert.equal(result.selectionStart, 6);
});

test('sætningsforslag kræver fokusordet og rangerer stikord højt', () => {
  const sentences = [
    { id: '1', text: 'Jeg vil gerne have kaffe.', keywords: ['kaffe'], priority: 80 },
    { id: '2', text: 'Jeg vil gerne have kage.', keywords: ['kage'], priority: 100 },
    { id: '3', text: 'Kaffen er varm.', keywords: ['kaffe', 'varm'], priority: 90 },
  ];
  const suggestions = rankSentenceSuggestions(sentences, ['kaffe'], 'kaffe', {}, 5);
  assert.deepEqual(suggestions.map((item) => item.id), ['3', '1']);
});

test('udleder meningsbærende stikord fra sætning', () => {
  assert.deepEqual(deriveKeywords('Jeg vil gerne have en kop kaffe.'), ['gerne', 'have', 'kop', 'kaffe']);
});

test('parser semikolonsepareret CSV med citationstegn', () => {
  const rows = parseDelimited('sætning;stikord;prioritet\n"Kaffe; tak";kaffe|tak;90');
  assert.deepEqual(rows, [
    ['sætning', 'stikord', 'prioritet'],
    ['Kaffe; tak', 'kaffe|tak', '90'],
  ]);
});

test('importerer ord-CSV', () => {
  const imported = dataFromCSV('ord;prioritet\nkaffe;90\nkage;80');
  assert.equal(imported.kind, 'words');
  assert.deepEqual(imported.data.words.map((word) => word.text), ['kaffe', 'kage']);
});

test('importerer sætnings-CSV og føjer ordene til ordlisten', () => {
  const imported = dataFromCSV('sætning;stikord;prioritet\nJeg vil have kaffe.;kaffe|drikke;90');
  assert.equal(imported.kind, 'sentences');
  assert.equal(imported.data.sentences.length, 1);
  assert.ok(imported.data.words.some((word) => word.text === 'kaffe'));
});

test('fletter dubletter uden at miste højeste prioritet', () => {
  const base = sanitizeData({
    words: [{ id: 'a', text: 'kaffe', priority: 40 }],
    sentences: [],
  });
  const incoming = sanitizeData({
    words: [{ id: 'b', text: 'kaffe', priority: 90 }],
    sentences: [],
  });
  const merged = mergeData(base, incoming);
  assert.equal(merged.words.filter((word) => word.text === 'kaffe').length, 1);
  assert.equal(merged.words.find((word) => word.text === 'kaffe').priority, 90);
});

test('CSV-eksport kan importeres igen', () => {
  const words = [{ id: '1', text: 'kaffe', priority: 90 }];
  const sentences = [{ id: '2', text: 'Kaffen er varm.', keywords: ['kaffe', 'varm'], priority: 80 }];

  const wordsRoundTrip = dataFromCSV(wordsToCSV(words));
  const sentencesRoundTrip = dataFromCSV(sentencesToCSV(sentences));
  assert.equal(wordsRoundTrip.data.words[0].text, 'kaffe');
  assert.equal(sentencesRoundTrip.data.sentences[0].text, 'Kaffen er varm.');
});

test('bevarer store bogstaver i personnavne i ordlisten', () => {
  const data = sanitizeData({
    words: [{ id: 'p', text: 'Peter', priority: 80 }],
    sentences: [{ id: 's', text: 'Peter kommer i morgen.', keywords: ['Peter'], priority: 80 }],
  });
  assert.ok(data.words.some((word) => word.text === 'Peter'));
  assert.equal(rankWordSuggestions(data.words, 'pe', {}, 5)[0].text, 'Peter');
});
