import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDoc } from '../js/model/doc.js';
import { createOp, updateOp, opById } from '../js/model/ops.js';
import { replayOps, stripMeta } from '../js/model/merge.js';

const who = { login: 'a' };
const now = '2026-09-14T00:00:00Z';

test('replayOps reapplies pending operations on a fresher remote document', () => {
  const remote = createOp(emptyDoc(), { id: 'theirs', title: 'Theirs', by: { login: 'b' }, at: now });
  const ops = [
    (d) => createOp(d, { id: 'mine', title: 'Mine', by: who, at: now }),
    (d) => updateOp(d, 'mine', { description: 'x' }, { by: who, at: now }),
  ];
  const merged = replayOps(remote, ops);
  assert.ok(opById(merged, 'theirs'));
  assert.equal(opById(merged, 'mine').description, 'x');
});

test('replayOps skips an op that throws and reports it; stripMeta removes the marker', () => {
  const ops = [(d) => updateOp(d, 'ghost', { title: 'Boo' }, { by: who, at: now })];
  const merged = replayOps(emptyDoc(), ops);
  assert.equal(merged.__skipped, 1);
  assert.equal(stripMeta(merged).__skipped, undefined);
});
