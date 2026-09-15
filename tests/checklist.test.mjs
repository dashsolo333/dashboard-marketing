import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDoc } from '../js/model/doc.js';
import { createOp, opById, addChecklistItem, setChecklistStatus, toggleChecklistItem, updateChecklistItem, removeChecklistItem, checklistProgress } from '../js/model/ops.js';
import { applyTemplate, DEFAULT_TEMPLATE, checklistStats, groupItems } from '../js/model/checklist.js';

const who = { login: 'nadir' };
const now = '2026-09-14T00:00:00Z';
const base = () => createOp(emptyDoc(), { id: 'o1', title: 'X', by: who, at: now });

test('template covers every pipeline stage after idea', () => {
  const groups = new Set(DEFAULT_TEMPLATE.map((t) => t.group));
  for (const g of ['brief', 'create', 'review', 'scheduled', 'published']) assert.ok(groups.has(g), g);
});

test('applyTemplate inserts the template once', () => {
  let d = applyTemplate(base(), 'o1', { by: who, at: now });
  assert.equal(opById(d, 'o1').items.length, DEFAULT_TEMPLATE.length);
  d = applyTemplate(d, 'o1', { by: who, at: now });
  assert.equal(opById(d, 'o1').items.length, DEFAULT_TEMPLATE.length);
});

test('checklist items: add, status, toggle, update, remove, progress', () => {
  let d = addChecklistItem(base(), 'o1', { id: 'i1', text: 'Écrire la légende', group: 'create', by: who, at: now });
  d = addChecklistItem(d, 'o1', { id: 'i2', text: 'Exporter la vidéo', due: '2026-09-10', by: who, at: now });
  d = setChecklistStatus(d, 'o1', 'i1', 'doing', { by: who, at: now });
  assert.equal(opById(d, 'o1').items[0].status, 'doing');
  d = toggleChecklistItem(d, 'o1', 'i1', { by: who, at: now });
  assert.equal(opById(d, 'o1').items[0].done, true);
  d = updateChecklistItem(d, 'o1', 'i2', { text: 'Exporter en 9:16' }, { by: who, at: now });
  assert.equal(opById(d, 'o1').items[1].text, 'Exporter en 9:16');
  assert.deepEqual(checklistProgress(opById(d, 'o1')), { done: 1, total: 2 });
  const st = checklistStats(opById(d, 'o1'), '2026-09-14');
  assert.equal(st.late, 1);
  assert.equal(st.pct, 50);
  const groups = groupItems(d, opById(d, 'o1'));
  assert.equal(groups[0].id, 'create');
  assert.equal(groups.at(-1).id, '');
  d = removeChecklistItem(d, 'o1', 'i2', { by: who, at: now });
  assert.equal(opById(d, 'o1').items.length, 1);
  assert.throws(() => addChecklistItem(d, 'o1', { id: 'i3', text: ' ', by: who, at: now }), /texte/i);
});
