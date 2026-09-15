import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDoc } from '../js/model/doc.js';
import {
  createOp, updateOp, moveOp, addReview, deleteOp, lastVerdict, isLate, opById, setResults,
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
  assert.equal(o.stepProgress, 0);
  assert.deepEqual(o.reviews, []);
  assert.deepEqual(o.channels, ['instagram']);
  assert.equal(o.createdBy.login, 'nadir');
  assert.equal(d.activity.length, 1);
  assert.equal(d.activity[0].type, 'create');
  assert.equal(d.activity[0].opId, 'o1');
});

test('createOp does not mutate the source doc', () => {
  const src = emptyDoc();
  createOp(src, { id: 'x', title: 'X', by: who, at: now });
  assert.equal(src.ops.length, 0);
});

test('createOp requires a title', () => {
  assert.throws(() => createOp(emptyDoc(), { id: 'x', title: '  ', by: who, at: now }), /titre/i);
});

test('updateOp merges a patch and stamps updatedAt/updatedBy', () => {
  const d = updateOp(withOne(), 'o1', { description: 'Teaser 15 s' }, { by: who, at: '2026-09-15T00:00:00Z' });
  const o = opById(d, 'o1');
  assert.equal(o.description, 'Teaser 15 s');
  assert.equal(o.updatedAt, '2026-09-15T00:00:00Z');
  assert.equal(opById(withOne(), 'o1').description, '');
});

test('updateOp drops unknown channels', () => {
  const d = updateOp(withOne(), 'o1', { channels: ['tiktok', 'ps5'] }, { by: who, at: now });
  assert.deepEqual(opById(d, 'o1').channels, ['tiktok']);
});

test('moveOp into the validation stage stamps the actual review date once', () => {
  let d = moveOp(withOne(), 'o1', 'review', { by: who, at: '2026-09-20T00:00:00Z' });
  let o = opById(d, 'o1');
  assert.equal(o.stageId, 'review');
  assert.equal(o.dates.reviewActual, '2026-09-20');
  assert.equal(o.stepProgress, 0);
  d = moveOp(d, 'o1', 'create', { by: who, at: '2026-09-21T00:00:00Z' });
  d = moveOp(d, 'o1', 'review', { by: who, at: '2026-09-22T00:00:00Z' });
  assert.equal(opById(d, 'o1').dates.reviewActual, '2026-09-20');
  assert.equal(d.activity.at(-1).type, 'move');
});

test('moveOp to published is refused without OK review unless forced, stamps publishActual and publishedBy', () => {
  const d = moveOp(withOne(), 'o1', 'review', { by: who, at: now });
  assert.throws(() => moveOp(d, 'o1', 'published', { by: who, at: now }), /validation/i);
  const d2 = addReview(d, 'o1', { id: 'r1', verdict: 'ok', notes: 'GO', by: who, at: now });
  const d3 = moveOp(d2, 'o1', 'published', { by: { login: 'lea', avatar: '' }, at: '2026-10-01T09:00:00Z' });
  const o = opById(d3, 'o1');
  assert.equal(o.dates.publishActual, '2026-10-01');
  assert.equal(o.publishedBy.login, 'lea');
  const forced = moveOp(d, 'o1', 'published', { by: who, at: now, force: true });
  assert.equal(opById(forced, 'o1').stageId, 'published');
  assert.match(forced.activity.at(-1).text, /forc/i);
});

test('addReview appends and lastVerdict picks the most recent', () => {
  let d = addReview(withOne(), 'o1', { id: 'r1', verdict: 'ko', notes: 'typo', by: who, at: '2026-09-01T00:00:00Z' });
  d = addReview(d, 'o1', { id: 'r2', verdict: 'ok', notes: '', by: who, at: '2026-09-03T00:00:00Z' });
  const o = opById(d, 'o1');
  assert.equal(o.reviews.length, 2);
  assert.equal(lastVerdict(o).verdict, 'ok');
  assert.equal(d.activity.at(-1).type, 'review');
});

test('addReview validates the verdict', () => {
  assert.throws(() => addReview(withOne(), 'o1', { id: 'r', verdict: 'meh', by: who, at: now }), /verdict/i);
});

test('setResults stores numeric metrics and ignores garbage', () => {
  const d = setResults(withOne(), 'o1', { views: '1200', likes: 40, clicks: 'abc' }, { by: who, at: now });
  const r = opById(d, 'o1').results;
  assert.equal(r.views, 1200);
  assert.equal(r.likes, 40);
  assert.equal(r.clicks, 0);
});

test('deleteOp removes it and journals', () => {
  const d = deleteOp(withOne(), 'o1', { by: who, at: now });
  assert.equal(d.ops.length, 0);
  assert.equal(d.activity.at(-1).type, 'delete');
});

test('isLate flags a planned date in the past without actual date', () => {
  const base = withOne();
  const o = { ...opById(base, 'o1'), dates: { reviewPlanned: '2026-09-01', reviewActual: '', publishPlanned: '2026-10-01', publishActual: '' } };
  assert.deepEqual(isLate(o, '2026-09-14'), { review: true, publish: false });
  const done = { ...o, dates: { ...o.dates, reviewActual: '2026-09-02' } };
  assert.deepEqual(isLate(done, '2026-09-14'), { review: false, publish: false });
});

test('activity journal is capped', () => {
  let d = emptyDoc();
  for (let i = 0; i < 620; i += 1) d = createOp(d, { id: `o${i}`, title: `O${i}`, by: who, at: now });
  assert.ok(d.activity.length <= 500);
  assert.equal(d.activity.at(-1).opId, 'o619');
});
