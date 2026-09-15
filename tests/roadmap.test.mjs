import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startOfWeek, addDays, dayOffset, weekRange, opSpan, weekLabel } from '../js/model/roadmap.js';
import { milestoneStatus, shiftDay } from '../js/model/milestones.js';
import { opTimeline } from '../js/model/timeline.js';
import { emptyDoc } from '../js/model/doc.js';
import { createOp, updateOp, moveOp, opById } from '../js/model/ops.js';

test('week helpers start on Monday and compute offsets', () => {
  assert.equal(startOfWeek('2026-09-16'), '2026-09-14');
  assert.equal(addDays('2026-09-14', 7), '2026-09-21');
  assert.equal(dayOffset('2026-09-14', '2026-09-21'), 7);
  const weeks = weekRange('2026-09-16', { before: 1, after: 1 });
  assert.equal(weeks.length, 3);
  assert.equal(weeks[1].isCurrent, true);
  assert.match(weekLabel('2026-09-14'), /14/);
});

test('opSpan runs from creation to the furthest known date, open when none', () => {
  const op = { createdAt: '2026-09-01T00:00:00Z', dates: { reviewPlanned: '', reviewActual: '', publishPlanned: '2026-09-20', publishActual: '' } };
  assert.deepEqual(opSpan(op, '2026-09-10'), { start: '2026-09-01', end: '2026-09-20', open: false });
  const open = opSpan({ ...op, dates: {} }, '2026-09-10');
  assert.equal(open.open, true);
  assert.equal(open.end, '2026-09-10');
});

test('milestoneStatus and shiftDay', () => {
  assert.equal(milestoneStatus({ planned: '2026-09-20', actual: '' }, '2026-09-16').label, 'J-4');
  assert.equal(milestoneStatus({ planned: '2026-09-10', actual: '' }, '2026-09-16').state, 'late');
  assert.equal(milestoneStatus({ planned: '2026-09-10', actual: '2026-09-10' }, '2026-09-16').label, 'Fait · à l’heure');
  assert.equal(milestoneStatus({ planned: '', actual: '' }, '2026-09-16').state, 'none');
  assert.equal(shiftDay('2026-09-16', { weeks: 2 }), '2026-09-30');
  assert.equal(shiftDay('2026-01-31', { months: 1 }), '2026-02-28');
});

test('opTimeline merges the journal with the planned dates', () => {
  const who = { login: 'n' };
  let d = createOp(emptyDoc(), { id: 'o', title: 'O', by: who, at: '2026-09-01T00:00:00Z' });
  d = updateOp(d, 'o', { dates: { publishPlanned: '2026-09-30' } }, { by: who, at: '2026-09-01T00:00:00Z' });
  d = moveOp(d, 'o', 'brief', { by: who, at: '2026-09-05T00:00:00Z' });
  const tl = opTimeline(d, opById(d, 'o'), '2026-09-16');
  assert.deepEqual(tl.map((e) => e.kind), ['create', 'move', 'publish']);
  assert.equal(tl.at(-1).future, true);
});
