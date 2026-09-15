// Mode « Avancement » : un coup à la fois, plein écran, centré sur la jauge.
import { h, icon, avatar, fmtDay, relTime, today } from './dom.js';
import { ringGauge } from './gauge.js';
import { gaugeOf, stageById, stageIndex } from '../model/stages.js';
import { isLate, lastVerdict, checklistProgress } from '../model/ops.js';
import { kindById } from '../model/doc.js';
import { visibleOps } from './filters.js';
import { channelDots } from './card.js';

export function focusList(ctx) {
  return [...visibleOps(ctx.doc, ctx.filters)].sort((a, b) => {
    const ga = gaugeOf(ctx.doc, a); const gb = gaugeOf(ctx.doc, b);
    return gb - ga || String(b.updatedAt).localeCompare(String(a.updatedAt));
  });
}

export function renderFocus(ctx) {
  const doc = ctx.doc;
  const list = focusList(ctx);
  if (!list.length) return h('div', { class: 'empty' }, h('b', {}, 'Aucun coup'), 'Change les filtres.');
  let i = list.findIndex((o) => o.id === ctx.focusId);
  if (i < 0) i = 0;
  const o = list[i];
  const stage = stageById(doc, o.stageId);
  const idx = stageIndex(doc, o.stageId);
  const value = gaugeOf(doc, o);
  const t = today();
  const late = isLate(o, t);
  const last = lastVerdict(o);
  const { done, total } = checklistProgress(o);
  const campaign = doc.campaigns.find((c) => c.id === o.campaignId);
  const go = (n) => ctx.setFocus(list[(i + n + list.length) % list.length].id);

  return h('section', { class: 'focus', style: { '--fc': stage?.color || '#8b8fa8' } },
    h('div', { class: 'focus-glow' }),
    h('header', { class: 'focus-top' },
      h('span', { class: 'muted' }, `${i + 1} / ${list.length}`),
      h('span', { class: 'dim' }, '·'),
      h('span', { class: 'muted' }, kindById(o.kind).label),
      campaign ? [h('span', { class: 'dim' }, '·'), h('span', { class: 'chip' }, campaign.icon ? `${campaign.icon} ` : '', campaign.name)] : null,
      h('div', { style: { marginLeft: 'auto', display: 'flex', gap: '8px' } },
        h('button', { type: 'button', class: 'btn btn-sm', onClick: () => ctx.openOp(o.id) }, 'Ouvrir la fiche'),
        h('button', { type: 'button', class: 'btn btn-sm btn-icon', title: 'Plein écran (f)', 'aria-label': 'Plein écran', onClick: toggleFullscreen }, icon('expand')))),

    h('div', { class: 'focus-body' },
      h('div', { class: 'focus-ring' }, ringGauge(doc, o, 260),
        h('div', { class: 'focus-ring-center' }, h('div', { class: 'focus-value' }, value, h('span', {}, '%')), h('div', { class: 'focus-stage' }, stage?.label || '—'))),
      h('div', { class: 'focus-info' },
        h('h1', { class: 'focus-title' }, o.icon ? h('span', { class: 'focus-icon' }, o.icon) : null, o.title),
        h('div', { class: 'focus-channels' }, channelDots(doc, o, { max: 8 })),
        o.description ? h('p', { class: 'focus-desc' }, o.description.split('\n')[0]) : null,
        h('ol', { class: 'focus-steps' }, doc.stages.map((s, k) => h('li', {
          class: `focus-step${k < idx ? ' is-done' : ''}${k === idx ? ' is-current' : ''}`, style: { '--sc': s.color },
        }, h('span', { class: 'focus-step-bar' }), h('span', { class: 'focus-step-label' }, s.label)))),
        h('div', { class: 'focus-facts' },
          fact('Validation', o.dates.reviewActual ? `faite le ${fmtDay(o.dates.reviewActual)}` : o.dates.reviewPlanned ? `cible ${fmtDay(o.dates.reviewPlanned)}` : '—', late.review ? 'late' : o.dates.reviewActual ? 'done' : ''),
          fact('Publication', o.dates.publishActual ? `publié le ${fmtDay(o.dates.publishActual)}` : o.dates.publishPlanned ? `cible ${fmtDay(o.dates.publishPlanned)}` : '—', late.publish ? 'late' : o.dates.publishActual ? 'done' : ''),
          fact('Dernier verdict', last ? `${last.verdict === 'ok' ? 'GO' : 'KO'} · ${fmtDay(last.at)}` : 'aucun', last ? (last.verdict === 'ok' ? 'done' : 'late') : ''),
          fact('Checklist', total ? `${done} / ${total}` : '—', total && done === total ? 'done' : ''),
          fact('Responsable', o.owner || '—'),
          h('div', { class: 'fact' }, h('span', { class: 'fact-label' }, 'Dernière action'), h('b', { style: { display: 'flex', alignItems: 'center', gap: '6px' } }, avatar(o.updatedBy, 18), `${o.updatedBy?.login || '—'} · ${relTime(o.updatedAt)}`))))),

    h('footer', { class: 'focus-nav' },
      h('button', { type: 'button', class: 'btn btn-icon', 'aria-label': 'Précédent', onClick: () => go(-1) }, icon('left')),
      h('div', { class: 'focus-dots' }, list.map((x, k) => h('button', {
        type: 'button', class: `focus-dot${k === i ? ' is-current' : ''}`, title: x.title, 'aria-label': x.title,
        style: { '--sc': stageById(doc, x.stageId)?.color }, onClick: () => ctx.setFocus(x.id),
      }))),
      h('button', { type: 'button', class: 'btn btn-icon', 'aria-label': 'Suivant', onClick: () => go(1) }, icon('right'))));
}

function fact(label, value, tone = '') {
  return h('div', { class: `fact${tone ? ` is-${tone}` : ''}` }, h('span', { class: 'fact-label' }, label), h('b', {}, value));
}

export function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.();
}
