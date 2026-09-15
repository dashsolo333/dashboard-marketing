import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_STAGES, DEFAULT_GATES, stageIndex, canMoveTo,
  renameStage, addStage, removeStage, moveStage, setGate,
} from '../js/model/stages.js';

const doc = { stages: DEFAULT_STAGES, gates: DEFAULT_GATES, ops: [] };

test('pipeline is Idée → Brief → Création → Validation → Programmé → Publié', () => {
  assert.deepEqual(DEFAULT_STAGES.map((s) => s.id), ['idea', 'brief', 'create', 'review', 'scheduled', 'published']);
  assert.equal(DEFAULT_GATES.finalStageId, 'published');
});

test('canMoveTo requires a last GO only for the final stage', () => {
  assert.equal(canMoveTo(doc, { reviews: [] }, 'scheduled').ok, true);
  assert.equal(canMoveTo(doc, { reviews: [] }, 'published').ok, false);
  assert.equal(canMoveTo(doc, { reviews: [{ verdict: 'ko', at: '2026-01-01' }] }, 'published').ok, false);
  assert.equal(canMoveTo(doc, { reviews: [{ verdict: 'ok', at: '2026-01-02' }, { verdict: 'ko', at: '2026-01-01' }] }, 'published').ok, true);
  assert.equal(canMoveTo(doc, { reviews: [] }, 'published', { force: true }).ok, true);
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

test('the final stage cannot be removed; the gate can be reassigned', () => {
  assert.throws(() => removeStage(doc, 'published'), /garde/i);
  assert.equal(setGate(doc, 'finalStageId', 'scheduled').gates.finalStageId, 'scheduled');
  assert.throws(() => setGate(doc, 'nope', 'idea'), /garde/i);
  assert.throws(() => setGate(doc, 'finalStageId', 'zzz'), /étape/i);
});
