import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDoc } from '../js/model/doc.js';
import { createOp, moveOp, addReview, updateOp, setResults } from '../js/model/ops.js';
import {
  xpOf, xpBreakdown, levelOf, LEVELS, streakWeeks, weeklyGoal, leaderboard, badges, seasonXp, seasonProgress,
} from '../js/model/game.js';

const who = { login: 'nadir', avatar: '' };
const lea = { login: 'lea', avatar: '' };
const at = (day) => `${day}T10:00:00Z`;

/** Crée un coup publié le jour donné (garde forcée pour aller vite). */
function published(doc, id, day, { kind = 'post', channels = ['instagram'], planned = '', by = who, results } = {}) {
  let d = createOp(doc, { id, title: id, kind, channels, by, at: at('2026-08-01') });
  if (planned) d = updateOp(d, id, { dates: { publishPlanned: planned } }, { by, at: at('2026-08-01') });
  d = addReview(d, id, { id: `r_${id}`, verdict: 'ok', by, at: at('2026-08-02') });
  d = moveOp(d, id, 'published', { by, at: at(day) });
  if (results) d = setResults(d, id, results, { by, at: at(day) });
  return d;
}

test('a coup earns XP only once published', () => {
  const d = createOp(emptyDoc(), { id: 'o1', title: 'X', kind: 'video', by: who, at: at('2026-09-01') });
  assert.equal(xpOf(d, d.ops[0]), 0);
  const p = published(emptyDoc(), 'o2', '2026-09-10', { kind: 'video' });
  assert.equal(xpOf(p, p.ops[0]), 25);
});

test('XP breakdown: base by kind, +5 per extra channel, +10 on time, results tiers', () => {
  const d = published(emptyDoc(), 'o1', '2026-09-10', { kind: 'post', channels: ['instagram', 'tiktok', 'linkedin'], planned: '2026-09-12', results: { views: 12000 } });
  const b = xpBreakdown(d, d.ops[0]);
  assert.equal(b.base, 10);
  assert.equal(b.channels, 10);
  assert.equal(b.onTime, 10);
  assert.equal(b.results, 30);
  assert.equal(b.total, 60);
  const late = published(emptyDoc(), 'o2', '2026-09-15', { planned: '2026-09-12' });
  assert.equal(xpBreakdown(late, late.ops[0]).onTime, 0);
});

test('levels are football ranks with cumulative thresholds', () => {
  assert.equal(levelOf(0).index, 0);
  assert.equal(levelOf(0).name, LEVELS[0].name);
  const l = levelOf(350);
  assert.equal(l.index, 2);
  assert.equal(l.next, LEVELS[3].xp);
  assert.ok(l.pct > 0 && l.pct < 100);
  assert.equal(levelOf(999999).next, null);
});

test('streak counts consecutive weeks with at least one publication, ending this or last week', () => {
  let d = emptyDoc();
  d = published(d, 'a', '2026-09-14'); // semaine courante (lundi)
  d = published(d, 'b', '2026-09-08'); // semaine -1
  d = published(d, 'c', '2026-09-02'); // semaine -2
  d = published(d, 'd', '2026-08-10'); // trou
  assert.equal(streakWeeks(d, '2026-09-16'), 3);
  // Rien cette semaine mais la semaine dernière : la série tient encore.
  assert.equal(streakWeeks(d, '2026-09-22'), 3);
  assert.equal(streakWeeks(d, '2026-09-29'), 0);
});

test('weeklyGoal reports this week publications against the configured goal', () => {
  let d = { ...emptyDoc(), game: { ...emptyDoc().game, weeklyGoal: 3 } };
  d = published(d, 'a', '2026-09-14');
  d = published(d, 'b', '2026-09-15');
  d = published(d, 'c', '2026-09-07');
  const g = weeklyGoal(d, '2026-09-16');
  assert.equal(g.done, 2);
  assert.equal(g.goal, 3);
  assert.equal(g.pct, 67);
});

test('leaderboard credits the owner, else the person who published', () => {
  let d = emptyDoc();
  d = published(d, 'a', '2026-09-10', { by: lea });
  d = published(d, 'b', '2026-09-11', { kind: 'video', by: who });
  d = updateOp(d, 'b', { owner: 'lea' }, { by: who, at: at('2026-09-11') });
  const board = leaderboard(d);
  assert.equal(board[0].login, 'lea');
  assert.equal(board[0].xp, 35);
  assert.equal(board[0].published, 2);
});

test('badges are computed from the document', () => {
  let d = emptyDoc();
  const ids = () => badges(d, '2026-09-16').filter((b) => b.earned).map((b) => b.id);
  assert.deepEqual(ids(), []);
  d = published(d, 'a', '2026-09-14', { channels: ['instagram', 'tiktok', 'linkedin'] });
  assert.ok(ids().includes('first'));
  assert.ok(ids().includes('multichannel'));
  d = published(d, 'b', '2026-09-15');
  d = published(d, 'c', '2026-09-15');
  assert.ok(ids().includes('hattrick'));
});

test('season XP only counts publications inside the season window', () => {
  let d = { ...emptyDoc(), game: { ...emptyDoc().game, season: { name: 'Rentrée', startAt: '2026-09-01', endAt: '2026-12-31', xpGoal: 100 } } };
  d = published(d, 'a', '2026-08-20', { kind: 'video' });
  d = published(d, 'b', '2026-09-10', { kind: 'video' });
  assert.equal(seasonXp(d), 25);
  const p = seasonProgress(d, '2026-09-16');
  assert.equal(p.pct, 25);
  assert.equal(p.daysLeft, 106);
});
