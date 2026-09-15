import { h, icon, avatar, fmtDay, today } from './dom.js';
import { isLate, lastVerdict, checklistProgress } from '../model/ops.js';
import { kindById } from '../model/doc.js';

/** Date de publication : prévue (drapeau), faite (coche), en retard (rouge). */
export function publishPill(op, t = today()) {
  const { publishPlanned, publishActual } = op.dates;
  if (!publishPlanned && !publishActual) return h('span', { class: 'date-pill is-empty' }, icon('flag'), 'à planifier');
  const late = isLate(op, t);
  const cls = `date-pill${publishActual ? ' is-done' : ''}${late ? ' is-late' : ''}`;
  const when = fmtDay(publishActual || publishPlanned) + (op.publishTime && !publishActual ? ` · ${op.publishTime}` : '');
  return h('span', { class: cls, title: publishActual ? `publié le ${fmtDay(publishActual)}` : `prévu le ${fmtDay(publishPlanned)}` }, icon(publishActual ? 'check' : 'flag'), when);
}

export function verdictBadge(op) {
  const last = lastVerdict(op);
  if (!last) return null;
  return h('span', { class: `badge badge-${last.verdict}`, title: `${last.by?.login || ''} · ${fmtDay(last.at)}${last.notes ? ` — ${last.notes}` : ''}` }, last.verdict === 'ok' ? 'Validé ✓' : 'Refusé ✗');
}

export function tasksChip(op) {
  const { done, total } = checklistProgress(op);
  if (!total) return null;
  return h('span', { class: `badge ${done === total ? 'badge-ok' : 'badge-neutral'}`, title: 'Checklist' }, `${done}/${total}`);
}

export function campaignChip(doc, op) {
  const c = doc.campaigns.find((x) => x.id === op.campaignId);
  return c ? h('span', { class: 'chip chip-campaign', title: 'Campagne' }, c.icon ? `${c.icon} ` : '', c.name) : null;
}

export function urgentBadge(op) {
  return op.urgent ? h('span', { class: 'badge badge-urgent' }, '🔥 Urgent') : null;
}

/** Pastilles des canaux (icône + couleur), compactes. */
export function channelDots(doc, op, { max = 4 } = {}) {
  const list = op.channels.map((id) => doc.channels.find((c) => c.id === id)).filter(Boolean);
  if (!list.length) return null;
  return h('span', { class: 'channels', title: list.map((c) => c.label).join(' · ') },
    list.slice(0, max).map((c) => h('span', { class: 'channel-dot', style: { '--ch': c.color } }, c.icon)),
    list.length > max ? h('span', { class: 'channel-more' }, `+${list.length - max}`) : null);
}

export function renderCard(ctx, op) {
  const doc = ctx.doc;
  const done = op.stageId === doc.gates.finalStageId; // un coup publié ne se déplace plus (comme dans le calendrier)
  const el = h('article', {
    class: `card glass${op.urgent ? ' is-urgent' : ''}${done ? ' is-done' : ''}`, tabindex: 0, role: 'button', draggable: ctx.canWrite() && !done ? 'true' : null,
    title: done ? 'Publié : pour revenir en arrière, utilise les étapes dans la fiche' : null,
    dataset: { id: op.id },
    onClick: () => ctx.openOp(op.id),
    onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.openOp(op.id); } },
    onDragstart: (e) => { e.dataTransfer.setData('text/plain', op.id); e.dataTransfer.effectAllowed = 'move'; el.classList.add('is-dragging'); },
    onDragend: () => el.classList.remove('is-dragging'),
  },
  h('div', { class: 'card-top' },
    h('span', { class: 'card-icon' }, op.icon || '•'),
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('div', { class: 'card-title' }, op.title),
      h('div', { class: 'card-sub' }, op.rubric || kindById(op.kind).label, channelDots(doc, op)))),
  h('div', { class: 'card-foot' },
    publishPill(op),
    urgentBadge(op),
    verdictBadge(op),
    tasksChip(op),
    campaignChip(doc, op),
    avatar(op.updatedBy, 20)));
  return el;
}
