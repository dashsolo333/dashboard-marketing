import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startOfWeek, addDays, dayOffset, monthGrid, shiftMonth, monthLabel, isoWeek } from '../js/model/calendar.js';
import { milestoneStatus, shiftDay } from '../js/model/milestones.js';
import { opTimeline } from '../js/model/timeline.js';
import { emptyDoc } from '../js/model/doc.js';
import { createOp, updateOp, moveOp, opById } from '../js/model/ops.js';

test('week helpers start on Monday and compute offsets', () => {
  assert.equal(startOfWeek('2026-09-16'), '2026-09-14');
  assert.equal(addDays('2026-09-14', 7), '2026-09-21');
  assert.equal(dayOffset('2026-09-14', '2026-09-21'), 7);
  assert.equal(isoWeek('2026-09-14'), 38);
});

test('monthGrid covers the month in full Monday-first weeks', () => {
  const g = monthGrid('2026-09', '2026-09-16');
  assert.equal(g.weeks.length, 5);
  assert.equal(g.weeks[0][0].day, '2026-08-31');
  assert.equal(g.weeks[0][0].inMonth, false);
  assert.equal(g.weeks[0][1].day, '2026-09-01');
  assert.equal(g.weeks.at(-1).at(-1).day, '2026-10-04');
  assert.ok(g.weeks[2].some((c) => c.day === '2026-09-16' && c.isToday));
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.match(monthLabel('2026-09'), /septembre 2026/i);
});

test('milestoneStatus and shiftDay', () => {
  assert.equal(milestoneStatus({ planned: '2026-09-20', actual: '' }, '2026-09-16').label, 'J-4');
  assert.equal(milestoneStatus({ planned: '2026-09-10', actual: '' }, '2026-09-16').state, 'late');
  assert.equal(milestoneStatus({ planned: '2026-09-10', actual: '2026-09-10' }, '2026-09-16').label, 'Fait · à l’heure');
  assert.equal(shiftDay('2026-09-16', { weeks: 2 }), '2026-09-30');
  assert.equal(shiftDay('2026-01-31', { months: 1 }), '2026-02-28');
});

test('opTimeline merges the journal with the planned publication', () => {
  const who = { login: 'n' };
  let d = createOp(emptyDoc(), { id: 'o', title: 'O', by: who, at: '2026-09-01T00:00:00Z' });
  d = updateOp(d, 'o', { dates: { publishPlanned: '2026-09-30' } }, { by: who, at: '2026-09-01T00:00:00Z' });
  d = moveOp(d, 'o', 'brief', { by: who, at: '2026-09-05T00:00:00Z' });
  const tl = opTimeline(d, opById(d, 'o'), '2026-09-16');
  assert.deepEqual(tl.map((e) => e.kind), ['create', 'move', 'publish']);
  assert.equal(tl.at(-1).future, true);
});
