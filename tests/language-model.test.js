import test from 'node:test';
import assert from 'node:assert/strict';
import { DanishPredictor, applyModelSuggestion, parseInput, recordContextChoice } from '../language-model.js';

// Synthetic counts ONLY for verifying algorithms. Not a trained Danish model.
export const fixture = {
  format: 'samtalestotte-language-model', schemaVersion: 1,
  metadata: { fixture: true },
  lexicon: ['jeg','kan','kaffe','kaffen','kage','har','ikke','i','er','for','varm','kold','st\u00e6rk',
    'min','mit','mine','mig','lav','ben','barn','navn','telefon','g\u00e5','hjem','hus','peter'],
  frequencies: { jeg: 1000, kan: 700, mit: 100, min: 200, mig: 180, mine: 80,
    kaffe: 90, kaffen: 30, kage: 20, i: 1000, ikke: 500, er: 800, lav: 12, ben: 50, navn: 30, kold: 10 },
  contexts: { jeg: [['kan', 60], ['er', 30], ['har', 10]],
    'jeg\u001fkan': [['ikke', 50], ['g\u00e5', 10]],
    'mit': [['ben', 20], ['navn', 10], ['barn', 5]],
    'min': [['telefon', 10]], 'kaffen\u001fer\u001ffor': [['varm', 6]],
    'er\u001ffor': [['kold', 4], ['varm', 3], ['st\u00e6rk', 2]] },
};
const make = () => new DanishPredictor(fixture);

test('COR vocabulary entries are available without a personal sentence', () => {
  assert.ok(make().hasWord('mit'));
  assert.equal(make().predict('mit')[0].text, 'ben');
});
test('short incomplete word uses context, not a stale focus word', () => {
  assert.equal(make().predict('jeg kan i')[0].text, 'ikke');
});
test('completed known word can offer next words without requiring a space', () => {
  assert.equal(make().predict('jeg')[0].text, 'kan');
});
test('shorter context supplies additional candidates without an exact sentence', () => {
  assert.deepEqual(make().predict('Kaffen er for').map(x => x.text), ['varm','kold','st\u00e6rk']);
});
test('candidate insertion preserves the already typed text and its case', () => {
  const text = 'jeg kan i';
  const out = applyModelSuggestion(text, make().predict(text)[0]);
  assert.equal(out.text, 'jeg kan ikke ');
});
test('next word insertion adds one space and does not duplicate existing text', () => {
  assert.equal(applyModelSuggestion('mit', make().predict('mit')[0]).text, 'mit ben ');
});
test('space after a completed word uses the same context', () => {
  assert.equal(applyModelSuggestion('mit ', make().predict('mit ')[0]).text, 'mit ben ');
});
test('editing inside a word replaces its suffix, not the rest of the message', () => {
  const text = 'jeg kan ike nu';
  const out = applyModelSuggestion(text, make().predict(text, 10)[0]);
  assert.equal(out.text, 'jeg kan ikke nu');
  assert.equal(out.selectionStart, 'jeg kan ikke '.length);
});
test('candidate cannot overwrite text that changed after it was produced', () => {
  assert.throws(() => applyModelSuggestion('kaffe', make().predict('jeg')[0]));
});
test('personal names not present in COR can be predicted', () => {
  const p = make(); p.setPersonal({ words: [{text:'Filippa',priority:70}] });
  assert.equal(p.predict('Fili')[0].text, 'Filippa');
});
test('personal phrase bank contributes continuations without changing the general model', () => {
  const p = make(); p.setPersonal({ sentences: [{text:'mit hus er stort',priority:80}] });
  assert.equal(p.predict('mit')[0].text, 'hus');
  assert.equal(make().predict('mit')[0].text, 'ben');
});
test('context learning changes ranking and is serializable for existing backups', () => {
  const p = make(); const u = {words:{},sentences:{}};
  recordContextChoice(u, ['mit'], 'navn', 100);
  assert.equal(p.predict('mit ', 4, JSON.parse(JSON.stringify(u)))[0].text,'navn');
});
test('empty input and sentence boundary do not emit arbitrary continuations', () => {
  assert.deepEqual(make().predict(''), []);
  assert.deepEqual(make().predict('jeg kan. '), []);
});
test('at most three choices with or without trailing space', () => {
  for (const text of ['mi','mit','mit ','ka','Kaffen er for']) assert.ok(make().predict(text).length <= 3);
});
test('prefix completion is available without any matching ngram', () => {
  assert.ok(make().predict('kaff').some(x => x.nextToken === 'kaffe'));
});
test('cursor and token information are correct', () => {
  const x = parseInput('min telefon', 6);
  assert.equal(x.prefix, 'te'); assert.equal(x.suffix, 'lefon');
  assert.equal(x.start,4); assert.equal(x.end,11);
});

test('personal learning stays on the most specific available context', () => {
  const p = make(); const u = {words:{},sentences:{},contexts:{}};
  recordContextChoice(u, ['stol','er','for'], 'lav', 100, 1);
  assert.equal(p.predict('stol er for ', 12, u)[0].text, 'lav');
  assert.notEqual(p.predict('kaffen er for ', 14, u)[0].text, 'lav');
});

test('typed learning can use a lower fractional weight', () => {
  const p = make(); const u = {words:{},sentences:{},contexts:{}};
  recordContextChoice(u, ['min','stol','er'], 'lav', 100, 0.35);
  const row = u.contexts['min\u001fstol\u001fer'];
  assert.equal(row.lav.count, 0.35);
  assert.equal(p.predict('min stol er ', 12, u)[0].text, 'lav');
});
