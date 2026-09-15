import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_STAGES, DEFAULT_GATES, stageIndex, gaugeOf, canMoveTo,
  renameStage, addStage, removeStage, moveStage, setGate,
} from '../js/model/stages.js';

const doc = { stages: DEFAULT_STAGES, gates: DEFAULT_GATES, ops: [] };

test('pipeline is Idée → Brief → Création → Validation → Programmé → Publié', () => {
  assert.deepEqual(DEFAULT_STAGES.map((s) => s.id), ['idea', 'brief', 'create', 'review', 'scheduled', 'published']);
  assert.equal(DEFAULT_GATES.reviewStageId, 'review');
  assert.equal(DEFAULT_GATES.finalStageId, 'published');
});

test('gauge is 0 at first stage and 100 at final stage', () => {
  assert.equal(gaugeOf(doc, { stageId: 'idea', stepProgress: 0 }), 0);
  assert.equal(gaugeOf(doc, { stageId: 'published', stepProgress: 0 }), 100);
});

test('gauge mixes stage index and step progress', () => {
  assert.equal(gaugeOf(doc, { stageId: 'create', stepProgress: 50 }), Math.round((2.5 / 6) * 100));
});

test('canMoveTo requires an OK review only for the final stage', () => {
  const op = { reviews: [] };
  assert.equal(canMoveTo(doc, op, 'scheduled').ok, true);
  assert.equal(canMoveTo(doc, op, 'published').ok, false);
  assert.equal(canMoveTo(doc, { reviews: [{ verdict: 'ko', at: '2026-01-01' }] }, 'published').ok, false);
  assert.equal(canMoveTo(doc, { reviews: [{ verdict: 'ok', at: '2026-01-02' }, { verdict: 'ko', at: '2026-01-01' }] }, 'published').ok, true);
  assert.equal(canMoveTo(doc, op, 'published', { force: true }).ok, true);
});

test('stages can be renamed, added, moved, removed; ops fall back one stage', () => {
  let d = { ...doc, ops: [{ id: 'a', stageId: 'create' }] };
  d = renameStage(d, 'brief', 'Brief créa');
  assert.equal(d.stages[1].label, 'Brief créa');
  d = addStage(d, { label: 'Tournage' }, 3);
  assert.equal(d.stages[3].label, 'Tournage');
  d = moveStage(d, d.stages[3].id, 1);
  assert.equal(d.stages[1].label, 'Tournage');
  d = removeStage(d, 'create');
  assert.equal(stageIndex(d, 'create'), -1);
  assert.equal(d.ops[0].stageId, 'brief');
});

test('gated stages cannot be removed; gates can be reassigned', () => {
  assert.throws(() => removeStage(doc, 'published'), /garde/i);
  const d = setGate(doc, 'reviewStageId', 'scheduled');
  assert.equal(d.gates.reviewStageId, 'scheduled');
  assert.throws(() => setGate(doc, 'nope', 'idea'), /garde/i);
});
