import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDoc } from '../js/model/doc.js';
import { createOp, updateOp, addReview, isReviewLate, reviewedAt, opById } from '../js/model/ops.js';
import { opSpan } from '../js/model/gantt.js';
import { opTimeline } from '../js/model/timeline.js';
import { weekRange } from '../js/model/calendar.js';

const who = { login: 'nadir' };
const at = '2026-09-10T10:00:00.000Z';
const today = '2026-09-15';
const base = () => createOp(emptyDoc(), { id: 'o1', title: 'Reel', kind: 'video', channels: ['instagram'], by: who, at });

test('opSpan runs from creation to the furthest date, open when no date', () => {
  let d = base();
  assert.deepEqual(opSpan(opById(d, 'o1'), today), { start: '2026-09-10', end: today, open: true });
  d = updateOp(d, 'o1', { dates: { reviewPlanned: '2026-09-18', publishPlanned: '2026-09-22' } }, { by: who, at });
  assert.deepEqual(opSpan(opById(d, 'o1'), today), { start: '2026-09-10', end: '2026-09-22', open: false });
});

test('reviewPlanned is kept, late without a GO, and cleared from the timeline once validated', () => {
  let d = updateOp(base(), 'o1', { dates: { reviewPlanned: '2026-09-12' } }, { by: who, at });
  const o = opById(d, 'o1');
  assert.equal(o.dates.reviewPlanned, '2026-09-12');
  assert.equal(isReviewLate(o, today), true);
  assert.ok(opTimeline(d, o, today).some((e) => e.kind === 'review' && e.late));
  d = addReview(d, 'o1', { id: 'r1', verdict: 'ok', by: who, at: '2026-09-14T09:00:00.000Z' });
  const v = opById(d, 'o1');
  assert.equal(reviewedAt(v), '2026-09-14');
  assert.equal(isReviewLate(v, today), false);
  assert.ok(!opTimeline(d, v, today).some((e) => e.kind === 'review' && e.text === 'Validation prévue'));
});

test('weekRange centres on the current week, Monday-based', () => {
  const weeks = weekRange('2026-09-15', { before: 1, after: 1 });
  assert.deepEqual(weeks.map((w) => w.start), ['2026-09-07', '2026-09-14', '2026-09-21']);
  assert.equal(weeks[1].isCurrent, true);
});
