import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEstimate, validateAnswers, validateConfig } from '../server/calculate.js';
import { seedConfig } from '../server/seed.js';
import { toPublicConfig } from '../server/public-config.js';

const valid = { roof_area: 1000, material: 'asphalt_arch', pitch: 'medium', layers: '1', stories: '2' };

test('calculates a deterministic range from configured values', () => {
  const result = calculateEstimate(seedConfig, valid);
  const midpoint = 1000 * 1.10 * 5.90 * 1.12 * 1.08 + 1000 * 1.15 + 350;
  assert.deepEqual(result, { midpoint: Math.round(midpoint), low: Math.round(midpoint * .88), high: Math.round(midpoint * 1.12) });
});

test('accepts numeric rates supplied as strings in production seed data', () => {
  const config = structuredClone(seedConfig);
  config.questions.find(q => q.key === 'pitch').options[1].multiplier = '1.12';
  assert.equal(calculateEstimate(config, valid).midpoint > 0, true);
});

test('rejects an out-of-range roof area and unknown options', () => {
  const errors = validateAnswers(seedConfig, { ...valid, roof_area: 100, material: 'invented' });
  assert.match(errors.roof_area, /300/); assert.match(errors.material, /available/);
});

test('ignores inactive questions during lead validation', () => {
  const config = structuredClone(seedConfig); config.questions.find(q => q.key === 'stories').active = false;
  const answers = { ...valid }; delete answers.stories;
  assert.deepEqual(validateAnswers(config, answers), {});
});

test('uses a database-configured fallback when a pricing question is hidden', () => {
  const config = structuredClone(seedConfig); const stories = config.questions.find(q => q.key === 'stories');
  stories.active = false; stories.inactive_default = '2';
  const answers = { ...valid }; delete answers.stories;
  assert.equal(calculateEstimate(config, answers).midpoint, calculateEstimate(seedConfig, valid).midpoint);
});

test('blocks configuration that could break the live calculation', () => {
  const config = structuredClone(seedConfig); config.questions.find(q => q.key === 'material').options[0].rate_per_sqft = 'oops';
  assert.match(validateConfig(config).join(' '), /invalid rate_per_sqft/);
});

test('public configuration contains UI fields but no pricing logic', () => {
  const publicConfig = toPublicConfig(seedConfig);
  assert.equal(publicConfig.questions.length, 5);
  assert.equal(publicConfig.questions.find(q => q.key === 'material').options[0].label, 'Asphalt shingle - 3-tab');
  const serialized = JSON.stringify(publicConfig);
  for (const secret of ['rate_per_sqft', 'multiplier', 'tear_off_per_sqft', 'modifiers', 'inactive_default']) assert.equal(serialized.includes(secret), false);
});
