// Campagnes : un objectif chiffré, une fenêtre, des coups rattachés, les résultats cumulés.
import { h, icon, fmtDay, today } from './dom.js';
import { stageById } from '../model/stages.js';
import { checklistProgress, opDay } from '../model/ops.js';
import { campaignTotals, campaignProgress } from '../model/stats.js';
import { updateCampaign } from '../model/campaigns.js';
import { RESULT_FIELDS } from '../model/doc.js';
import { visibleOps } from './filters.js';
import { publishPill } from './card.js';

const fmtN = (n) => new Intl.NumberFormat('fr-FR').format(n);

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
  const ro = !ctx.canWrite();
  const totals = campaignTotals(doc, c.id);
  const prog = campaignProgress(c);
  const state = c.endAt && c.endAt < t ? 'done' : c.startAt && c.startAt > t ? 'soon' : 'live';
  const setActual = (v) => ctx.act(`a mis à jour l’objectif de la campagne ${c.name}`, (d) => updateCampaign(d, c.id, { actual: v }));
  const sorted = [...ops].sort((a, b) => (opDay(a) || '9999').localeCompare(opDay(b) || '9999'));
  const metrics = RESULT_FIELDS.filter((f) => totals[f.id] > 0);
  return h('section', { class: `release glass campaign is-${state}` },
    h('div', { class: 'release-head' },
      h('div', {}, h('div', { class: 'release-version' }, c.icon ? `${c.icon} ` : '', c.name)),
      h('div', { class: 'release-date' },
        state === 'done' ? h('span', { class: 'badge badge-ok' }, 'Terminée') : state === 'soon' ? h('span', { class: 'badge badge-neutral' }, 'À venir') : h('span', { class: 'badge badge-live' }, 'En cours'),
        h('b', {}, c.startAt || c.endAt ? `${c.startAt ? fmtDay(c.startAt) : '…'} → ${c.endAt ? fmtDay(c.endAt) : '…'}` : 'sans dates'))),
    c.goal || c.target ? h('div', { class: 'goal' },
      h('div', { class: 'goal-head' },
        h('span', { class: 'goal-label' }, icon('flag'), c.goal || 'Objectif'),
        c.target ? h('span', { class: 'goal-figures' },
          ro ? h('b', {}, fmtN(prog.actual)) : h('input', { class: 'input goal-input', type: 'number', min: 0, value: prog.actual, 'aria-label': 'Réalisé', dataset: { key: `goal:${c.id}` }, onChange: (e) => setActual(e.target.value) }),
          h('span', { class: 'dim' }, ` / ${fmtN(prog.target)}`),
          h('b', { class: `goal-pct${prog.pct >= 100 ? ' is-done' : ''}` }, `${prog.pct} %`)) : null),
      c.target ? h('div', { class: 'bar bar-goal' }, h('i', { style: { width: `${prog.pct}%` } })) : null)
      : h('button', { type: 'button', class: 'goal goal-empty', onClick: () => ctx.openSettings('campaigns') }, icon('flag'), 'Fixer un objectif chiffré'),
    h('div', { class: 'release-progress' },
      h('div', { class: 'bar', style: { '--bar': state === 'done' ? '#b5f03a' : '#8b5cf6' } }, h('i', { style: { width: `${totals.total ? Math.round((totals.published / totals.total) * 100) : 0}%` } })),
      h('span', {}, `${totals.published}/${totals.total} publié${totals.published > 1 ? 's' : ''}`)),
    metrics.length ? h('div', { class: 'totals' }, metrics.map((f) => h('span', { class: 'total' }, h('b', {}, fmtN(totals[f.id])), ` ${f.label.toLowerCase()}`))) : null,
    h('div', { class: 'release-list' },
      sorted.length ? sorted.map((o) => item(ctx, o)) : h('div', { class: 'dim', style: { padding: '6px 10px' } }, 'Aucun coup rattaché. Ouvre une fiche et choisis cette campagne.')));
}

function item(ctx, o) {
  const stage = stageById(ctx.doc, o.stageId);
  const tk = checklistProgress(o);
  return h('div', { class: 'release-item', onClick: () => ctx.openOp(o.id), role: 'button', tabindex: 0 },
    h('span', { class: 'release-item-icon' }, o.icon || '•'),
    h('span', { class: 'name' }, o.title),
    tk.total ? h('span', { class: `badge ${tk.done === tk.total ? 'badge-ok' : 'badge-neutral'}`, title: 'Checklist' }, `${tk.done}/${tk.total}`) : null,
    publishPill(o),
    h('span', { class: 'chip chip-stage chip-xs', style: { '--dot': stage?.color } }, h('i', { class: 'chip-dot' }), stage?.label));
}
