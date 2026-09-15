import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDoc } from '../js/model/doc.js';
import { createOp, opById } from '../js/model/ops.js';
import { bulkMove, bulkUpdate, bulkDelete } from '../js/model/bulk.js';

const who = { login: 'nadir' };
const now = '2026-09-14T00:00:00Z';
const two = () => {
  const d = createOp(emptyDoc(), { id: 'a', title: 'A', by: who, at: now });
  return createOp(d, { id: 'b', title: 'B', by: who, at: now });
};

test('bulkMove moves what it can and lists what the gate blocks', () => {
  const r = bulkMove(two(), ['a', 'b'], 'published', { by: who, at: now });
  assert.deepEqual(r.moved, []);
  assert.equal(r.blocked.length, 2);
  const ok = bulkMove(two(), ['a', 'b'], 'brief', { by: who, at: now });
  assert.deepEqual(ok.moved, ['a', 'b']);
  assert.deepEqual(bulkMove(two(), ['a'], 'published', { by: who, at: now, force: true }).moved, ['a']);
});

test('bulkUpdate and bulkDelete count what they touched', () => {
  const u = bulkUpdate(two(), ['a', 'ghost'], { urgent: true }, { by: who, at: now });
  assert.equal(u.updated, 1);
  assert.equal(opById(u.doc, 'a').urgent, true);
  const del = bulkDelete(u.doc, ['a', 'b'], { by: who, at: now });
  assert.equal(del.deleted, 2);
  assert.equal(del.doc.ops.length, 0);
});
