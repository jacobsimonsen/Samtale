import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DanishPredictor } from '../language-model.js';

const data = JSON.parse(fs.readFileSync(new URL('../language-data.json', import.meta.url), 'utf8'));

test('bundled real language model has the expected provenance and size', () => {
  assert.equal(data.format, 'samtalestotte-language-model');
  assert.equal(data.metadata?.fixture, false);
  assert.ok(data.lexicon.length > 300000);
  assert.ok(Object.keys(data.contexts).length > 20000);
});

test('bundled model covers common Danish forms and useful context', () => {
  const predictor = new DanishPredictor(data);
  assert.ok(predictor.hasWord('mit'));
  assert.ok(predictor.hasWord('min'));
  assert.ok(predictor.predict('jeg kan i').some((x) => x.text === 'ikke'));
});
