import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoDoc } from '../js/model/seed.js';
import { normalizeDoc } from '../js/model/doc.js';
import { canMoveTo } from '../js/model/stages.js';

test('demo document is normalized, consistent and shows every stage', () => {
  const d = normalizeDoc(demoDoc({ today: '2026-09-15' }));
  assert.ok(d.ops.length >= 8);
  assert.ok(d.campaigns.length >= 1);
  const stages = new Set(d.ops.map((o) => o.stageId));
  for (const s of d.stages) assert.ok(stages.has(s.id), `étape ${s.id} vide`);
  for (const o of d.ops) {
    assert.ok(d.stages.some((s) => s.id === o.stageId), o.id);
    for (const c of o.channels) assert.ok(d.channels.some((x) => x.id === c), `${o.id}:${c}`);
    for (const c of Object.keys(o.results.channels)) assert.ok(o.channels.includes(c), `${o.id} résultats sur ${c}`);
    if (o.campaignId) assert.ok(d.campaigns.some((c) => c.id === o.campaignId), o.id);
    if (o.stageId === d.gates.finalStageId) {
      assert.ok(o.dates.publishActual, `${o.id} publié sans date`);
      assert.equal(canMoveTo(d, o, d.gates.finalStageId).ok, true, `${o.id} publié sans GO`);
    }
  }
  assert.ok(d.ops.some((o) => o.rubric), 'aucune rubrique');
  assert.ok(d.ops.some((o) => o.caption), 'aucune légende');
  assert.ok(d.activity.length > 0);
});

test('normalizeDoc migrates old-shaped documents (priority, flat results, review dates)', () => {
  const d = normalizeDoc({ ops: [{ id: 'x', title: 'X', priority: 'p0', channels: ['instagram'], results: { views: 12 }, dates: { reviewPlanned: '2026-01-01', publishPlanned: '2026-02-01' } }], gates: { reviewStageId: 'review', finalStageId: 'published' } });
  const o = d.ops[0];
  assert.equal(o.urgent, true);
  assert.deepEqual(Object.keys(o.dates), ['reviewPlanned', 'publishPlanned', 'publishActual']);
  assert.equal(o.dates.reviewPlanned, '2026-01-01');
  assert.deepEqual(o.results, { channels: {}, notes: '' });
  assert.deepEqual(Object.keys(d.gates), ['finalStageId']);
});
