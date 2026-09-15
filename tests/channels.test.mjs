import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDoc, DEFAULT_CHANNELS } from '../js/model/doc.js';
import { addChannel, renameChannel, removeChannel, channelById } from '../js/model/channels.js';
import { createOp, opById } from '../js/model/ops.js';

const who = { login: 'nadir' };
const now = '2026-09-14T00:00:00Z';

test('default channels include the social networks and the ambassador program', () => {
  const ids = DEFAULT_CHANNELS.map((c) => c.id);
  for (const id of ['instagram', 'tiktok', 'linkedin', 'blog', 'ambassadors']) assert.ok(ids.includes(id), id);
});

test('addChannel creates an id from the label and refuses duplicates', () => {
  const d = addChannel(emptyDoc(), { label: 'Discord', icon: '💬', color: '#5865f2' });
  const c = d.channels.at(-1);
  assert.equal(c.id, 'discord');
  assert.equal(c.label, 'Discord');
  assert.throws(() => addChannel(d, { label: 'Discord' }), /existe/i);
  assert.throws(() => addChannel(d, { label: '   ' }), /nom/i);
});

test('renameChannel and removeChannel keep ops consistent', () => {
  let d = createOp(emptyDoc(), { id: 'o1', title: 'X', channels: ['tiktok', 'linkedin'], by: who, at: now });
  d = renameChannel(d, 'tiktok', { label: 'TikTok FR' });
  assert.equal(channelById(d, 'tiktok').label, 'TikTok FR');
  d = removeChannel(d, 'tiktok');
  assert.equal(channelById(d, 'tiktok'), null);
  assert.deepEqual(opById(d, 'o1').channels, ['linkedin']);
});
