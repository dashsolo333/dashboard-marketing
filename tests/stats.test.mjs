import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDoc } from '../js/model/doc.js';
import { createOp, updateOp, moveOp, addReview, setResults } from '../js/model/ops.js';
import { channelStats, campaignTotals, campaignProgress } from '../js/model/stats.js';
import { addCampaign, updateCampaign, removeCampaign } from '../js/model/campaigns.js';

const who = { login: 'n' };
const at = (day) => `${day}T10:00:00Z`;

function planned(doc, id, day, channels) {
  let d = createOp(doc, { id, title: id, channels, by: who, at: at('2026-09-01') });
  return updateOp(d, id, { dates: { publishPlanned: day } }, { by: who, at: at('2026-09-01') });
}
function published(doc, id, day, channels, campaignId = '') {
  let d = createOp(doc, { id, title: id, channels, campaignId, by: who, at: at('2026-08-01') });
  d = addReview(d, id, { id: `r${id}`, verdict: 'ok', by: who, at: at('2026-08-02') });
  return moveOp(d, id, 'published', { by: who, at: at(day) });
}

test('channelStats counts publications per channel for this week, this month, next 30 days and last 8 weeks', () => {
  let d = emptyDoc();
  d = published(d, 'a', '2026-09-14', ['instagram', 'tiktok']);
  d = published(d, 'b', '2026-09-02', ['instagram']);
  d = planned(d, 'c', '2026-09-18', ['instagram']);
  d = planned(d, 'e', '2026-10-30', ['tiktok']);
  d = planned(d, 'f', '', ['linkedin']);
  const stats = channelStats(d, '2026-09-16');
  const ig = stats.find((s) => s.channel.id === 'instagram');
  assert.equal(ig.week, 2);
  assert.equal(ig.month, 3);
  assert.equal(ig.next30, 1);
  assert.equal(ig.last, '2026-09-14');
  assert.equal(ig.weeks.length, 8);
  assert.equal(ig.weeks.at(-1), 2);
  const tk = stats.find((s) => s.channel.id === 'tiktok');
  assert.equal(tk.next30, 0);
  const li = stats.find((s) => s.channel.id === 'linkedin');
  assert.equal(li.unscheduled, 1);
  assert.equal(li.last, '');
});

test('campaigns: add, update, remove; totals and progress', () => {
  let d = addCampaign(emptyDoc(), { id: 'c1', name: 'Rentrée', goal: 'Ligues créées', target: 10 });
  assert.equal(d.campaigns[0].target, 10);
  d = updateCampaign(d, 'c1', { actual: 4 });
  assert.deepEqual(campaignProgress(d.campaigns[0]), { actual: 4, target: 10, pct: 40 });
  d = published(d, 'a', '2026-09-10', ['instagram', 'tiktok'], 'c1');
  d = setResults(d, 'a', { channel: 'instagram', metrics: { views: 100, likes: 5 } }, { by: who, at: at('2026-09-11') });
  d = setResults(d, 'a', { channel: 'tiktok', metrics: { views: 50 } }, { by: who, at: at('2026-09-11') });
  const t = campaignTotals(d, 'c1');
  assert.equal(t.views, 150);
  assert.equal(t.likes, 5);
  assert.equal(t.published, 1);
  assert.equal(t.total, 1);
  d = removeCampaign(d, 'c1');
  assert.equal(d.campaigns.length, 0);
  assert.equal(d.ops[0].campaignId, '');
  assert.throws(() => addCampaign(d, { id: 'x', name: ' ' }), /nom/i);
});
