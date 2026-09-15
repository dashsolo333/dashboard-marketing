import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDoc, formatEffort, normalizeEffort, effortHours } from '../js/model/doc.js';
import {
  createOp, updateOp, moveOp, addReview, deleteOp, lastVerdict, isLate, opById, setResults, duplicateOp, opDay, setOrder, byRank,
} from '../js/model/ops.js';

const who = { login: 'nadir', avatar: 'https://x/y.png' };
const now = '2026-09-14T12:00:00.000Z';

const withOne = () => createOp(emptyDoc(), {
  id: 'o1', title: 'Reel lancement', kind: 'video', channels: ['instagram'], by: who, at: now,
});

test('createOp adds a coup at the first stage with defaults and journals it', () => {
  const d = withOne();
  const o = opById(d, 'o1');
  assert.equal(o.stageId, 'idea');
  assert.equal(o.urgent, false);
  assert.equal(o.publishTime, '');
  assert.equal(o.caption, '');
  assert.deepEqual(o.reviews, []);
  assert.deepEqual(o.results, { channels: {}, notes: '' });
  assert.deepEqual(o.channels, ['instagram']);
  assert.equal(d.activity[0].type, 'create');
  assert.equal(d.activity[0].opId, 'o1');
});

test('createOp does not mutate the source doc and requires a title', () => {
  const src = emptyDoc();
  createOp(src, { id: 'x', title: 'X', by: who, at: now });
  assert.equal(src.ops.length, 0);
  assert.throws(() => createOp(emptyDoc(), { id: 'x', title: '  ', by: who, at: now }), /titre/i);
});

test('updateOp merges a patch, validates time and drops unknown channels', () => {
  let d = updateOp(withOne(), 'o1', { caption: 'Teaser 15 s', publishTime: '18:30', hashtags: '#futnow', rubric: 'Best-of', urgent: true }, { by: who, at: '2026-09-15T00:00:00Z' });
  const o = opById(d, 'o1');
  assert.equal(o.caption, 'Teaser 15 s');
  assert.equal(o.publishTime, '18:30');
  assert.equal(o.urgent, true);
  assert.equal(o.updatedAt, '2026-09-15T00:00:00Z');
  d = updateOp(d, 'o1', { publishTime: 'bad', channels: ['tiktok', 'ps5'] }, { by: who, at: now });
  assert.equal(opById(d, 'o1').publishTime, '');
  assert.deepEqual(opById(d, 'o1').channels, ['tiktok']);
});

test('moveOp to published is refused without GO unless forced, stamps publishActual and publishedBy', () => {
  const d = moveOp(withOne(), 'o1', 'review', { by: who, at: now });
  assert.equal(opById(d, 'o1').stageId, 'review');
  assert.throws(() => moveOp(d, 'o1', 'published', { by: who, at: now }), /valid/i);
  const d2 = addReview(d, 'o1', { id: 'r1', verdict: 'ok', notes: 'GO', by: who, at: now });
  const d3 = moveOp(d2, 'o1', 'published', { by: { login: 'lea', avatar: '' }, at: '2026-10-01T09:00:00Z' });
  const o = opById(d3, 'o1');
  assert.equal(o.dates.publishActual, '2026-10-01');
  assert.equal(o.publishedBy.login, 'lea');
  const forced = moveOp(d, 'o1', 'published', { by: who, at: now, force: true });
  assert.equal(opById(forced, 'o1').stageId, 'published');
  assert.match(forced.activity.at(-1).text, /forc/i);
});

test('addReview appends, lastVerdict picks the most recent, verdict is validated', () => {
  let d = addReview(withOne(), 'o1', { id: 'r1', verdict: 'ko', notes: 'typo', by: who, at: '2026-09-01T00:00:00Z' });
  d = addReview(d, 'o1', { id: 'r2', verdict: 'ok', notes: '', by: who, at: '2026-09-03T00:00:00Z' });
  assert.equal(lastVerdict(opById(d, 'o1')).verdict, 'ok');
  assert.equal(d.activity.at(-1).type, 'review');
  assert.throws(() => addReview(withOne(), 'o1', { id: 'r', verdict: 'meh', by: who, at: now }), /verdict/i);
});

test('setResults stores per-channel metrics and notes, ignores garbage', () => {
  let d = setResults(withOne(), 'o1', { channel: 'instagram', metrics: { views: '1200', likes: 40, clicks: 'abc' } }, { by: who, at: now });
  d = setResults(d, 'o1', { notes: 'Bon format' }, { by: who, at: now });
  const r = opById(d, 'o1').results;
  assert.equal(r.channels.instagram.views, 1200);
  assert.equal(r.channels.instagram.likes, 40);
  assert.equal(r.channels.instagram.clicks, 0);
  assert.equal(r.notes, 'Bon format');
  assert.throws(() => setResults(d, 'o1', { channel: 'ps5', metrics: {} }, { by: who, at: now }), /canal/i);
});

test('duplicateOp copies content, resets progress and shifts the date by a week', () => {
  let d = updateOp(withOne(), 'o1', { caption: 'Légende', dates: { publishPlanned: '2026-09-20' }, publishTime: '18:00' }, { by: who, at: now });
  d = addReview(d, 'o1', { id: 'r1', verdict: 'ok', by: who, at: now });
  d = duplicateOp(d, 'o1', { id: 'o2', by: who, at: '2026-09-21T00:00:00Z' });
  const o = opById(d, 'o2');
  assert.equal(o.title, 'Reel lancement (copie)');
  assert.equal(o.caption, 'Légende');
  assert.equal(o.publishTime, '18:00');
  assert.equal(o.stageId, 'idea');
  assert.equal(o.dates.publishPlanned, '2026-09-27');
  assert.equal(o.dates.publishActual, '');
  assert.deepEqual(o.reviews, []);
  assert.equal(d.activity.at(-1).type, 'create');
});

test('deleteOp removes it and journals; isLate and opDay', () => {
  const d = deleteOp(withOne(), 'o1', { by: who, at: now });
  assert.equal(d.ops.length, 0);
  const o = { ...opById(withOne(), 'o1'), dates: { publishPlanned: '2026-09-01', publishActual: '' } };
  assert.equal(isLate(o, '2026-09-14'), true);
  assert.equal(isLate({ ...o, dates: { ...o.dates, publishActual: '2026-09-02' } }, '2026-09-14'), false);
  assert.equal(opDay(o), '2026-09-01');
  assert.equal(opDay({ ...o, dates: { publishPlanned: '2026-09-01', publishActual: '2026-09-03' } }), '2026-09-03');
});

test('activity journal is capped', () => {
  let d = emptyDoc();
  for (let i = 0; i < 620; i += 1) d = createOp(d, { id: `o${i}`, title: `O${i}`, by: who, at: now });
  assert.ok(d.activity.length <= 500);
});

test('setOrder assigns manual ranks in the given order and journals once', () => {
  let d = withOne();
  d = createOp(d, { id: 'o2', title: 'Deux', kind: 'post', channels: [], by: who, at: '2026-09-14T13:00:00.000Z' });
  d = createOp(d, { id: 'o3', title: 'Trois', kind: 'post', channels: [], by: who, at: '2026-09-14T14:00:00.000Z' });
  const before = d.activity.length;
  d = setOrder(d, ['o3', 'o1', 'ghost'], { by: who, at: now });
  assert.equal(opById(d, 'o3').rank, 10);
  assert.equal(opById(d, 'o1').rank, 20);
  assert.equal(opById(d, 'o2').rank, null);
  assert.equal(d.activity.length, before + 1);
  assert.deepEqual([...d.ops].sort(byRank).map((o) => o.id), ['o3', 'o1', 'o2']);
  // Idempotent : même ordre → même document, pas de nouvelle entrée
  assert.equal(setOrder(d, ['o3', 'o1'], { by: who, at: now }), d);
});

test('effort: value + unit normalised, formatted as « x h / x J / x S », sortable in hours', () => {
  let d = withOne();
  assert.deepEqual(opById(d, 'o1').effort, { value: null, unit: 'h' });
  assert.equal(formatEffort(opById(d, 'o1').effort), '');
  d = updateOp(d, 'o1', { effort: { value: 2.5, unit: 'd' } }, { by: who, at: now });
  assert.equal(formatEffort(opById(d, 'o1').effort), '2,5 J');
  assert.equal(effortHours(opById(d, 'o1').effort), 20);
  assert.deepEqual(normalizeEffort({ value: '3', unit: 'w' }), { value: 3, unit: 'w' });
  assert.deepEqual(normalizeEffort({ value: -1, unit: 'zz' }), { value: null, unit: 'h' });
});
