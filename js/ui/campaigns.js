// Campagnes : un objectif, une fenêtre, des coups rattachés.
import { h, icon, fmtDay, today } from './dom.js';
import { gaugeOf, stageById } from '../model/stages.js';
import { checklistProgress } from '../model/ops.js';
import { ringGauge } from './gauge.js';
import { visibleOps } from './filters.js';

export function renderCampaigns(ctx) {
  const doc = ctx.doc;
  const ops = visibleOps(doc, ctx.filters);
  const t = today();
  const campaigns = [...doc.campaigns].sort((a, b) => (a.startAt || '9999').localeCompare(b.startAt || '9999'));
  const orphan = ops.filter((o) => !o.campaignId || !doc.campaigns.some((c) => c.id === o.campaignId));
  return h('div', { class: 'releases' },
    campaigns.map((c) => renderCampaign(ctx, c, ops.filter((o) => o.campaignId === c.id), t)),
    h('button', { type: 'button', class: 'release-add', onClick: () => ctx.openSettings('campaigns') }, h('span', {}, icon('plus'), ' Nouvelle campagne')),
    orphan.length ? h('section', { class: 'release glass', style: { borderStyle: 'dashed' } },
      h('div', { class: 'release-head' }, h('div', {}, h('div', { class: 'release-version', style: { fontSize: '18px' } }, 'Hors campagne'), h('div', { class: 'release-name' }, `${orphan.length} coup${orphan.length > 1 ? 's' : ''} isolé${orphan.length > 1 ? 's' : ''}`))),
      h('div', { class: 'release-list' }, orphan.map((o) => item(ctx, o)))) : null);
}

function renderCampaign(ctx, c, ops, t) {
  const doc = ctx.doc;
  const avg = ops.length ? Math.round(ops.reduce((s, o) => s + gaugeOf(doc, o), 0) / ops.length) : 0;
  const published = ops.filter((o) => o.stageId === doc.gates.finalStageId).length;
  const state = c.endAt && c.endAt < t ? 'done' : c.startAt && c.startAt > t ? 'soon' : 'live';
  return h('section', { class: `release glass campaign is-${state}` },
    h('div', { class: 'release-head' },
      h('div', {}, h('div', { class: 'release-version' }, c.icon ? `${c.icon} ` : '', c.name), c.goal ? h('div', { class: 'release-name' }, c.goal) : null),
      h('div', { class: 'release-date' },
        state === 'done' ? h('span', { class: 'badge badge-ok' }, 'Terminée') : state === 'soon' ? h('span', { class: 'badge badge-neutral' }, 'À venir') : h('span', { class: 'badge badge-live' }, 'En cours'),
        h('b', {}, c.startAt || c.endAt ? `${c.startAt ? fmtDay(c.startAt) : '…'} → ${c.endAt ? fmtDay(c.endAt) : '…'}` : 'sans dates'))),
    h('div', { class: 'release-progress' },
      h('div', { class: 'bar', style: { '--bar': state === 'done' ? '#b5f03a' : '#8b5cf6' } }, h('i', { style: { width: `${avg}%` } })),
      h('span', {}, `${published}/${ops.length} publié${published > 1 ? 's' : ''} · ${avg} %`)),
    h('div', { class: 'release-list' },
      ops.length ? ops.map((o) => item(ctx, o)) : h('div', { class: 'dim', style: { padding: '6px 10px' } }, 'Aucun coup rattaché. Ouvre une fiche et choisis cette campagne.')));
}

function item(ctx, o) {
  const stage = stageById(ctx.doc, o.stageId);
  const t = checklistProgress(o);
  return h('div', { class: 'release-item', onClick: () => ctx.openOp(o.id), role: 'button', tabindex: 0 },
    ringGauge(ctx.doc, o, 26), h('span', { class: 'name' }, `${o.icon ? `${o.icon} ` : ''}${o.title}`),
    t.total ? h('span', { class: `badge ${t.done === t.total ? 'badge-ok' : 'badge-neutral'}`, title: 'Checklist' }, `${t.done}/${t.total}`) : null,
    h('span', { class: 'chip chip-stage', style: { '--dot': stage?.color } }, h('i', { class: 'chip-dot' }), stage?.label));
}
