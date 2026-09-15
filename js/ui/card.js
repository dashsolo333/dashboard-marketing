import { h, icon, avatar, fmtDay, today } from './dom.js';
import { progressRow } from './gauge.js';
import { isLate, lastVerdict, checklistProgress } from '../model/ops.js';
import { kindById } from '../model/doc.js';
import { xpOf, isPublished } from '../model/game.js';

export function datePill(label, planned, actual, late) {
  if (!planned && !actual) return null;
  const cls = `date-pill${actual ? ' is-done' : ''}${late ? ' is-late' : ''}`;
  return h('span', { class: cls, title: `${label} : ${actual ? `fait le ${fmtDay(actual)}` : `prévu le ${fmtDay(planned)}`}` },
    icon(actual ? 'check' : 'flag'), `${label} ${fmtDay(actual || planned)}`);
}

export function verdictBadge(op) {
  const last = lastVerdict(op);
  if (!last) return null;
  return h('span', { class: `badge badge-${last.verdict}`, title: last.notes || '' }, last.verdict === 'ok' ? 'GO ✓' : 'KO ✗');
}

export function tasksChip(op) {
  const { done, total } = checklistProgress(op);
  if (!total) return null;
  return h('span', { class: `badge ${done === total ? 'badge-ok' : 'badge-neutral'}`, title: 'Checklist' }, `${done}/${total} tâches`);
}

export function campaignChip(doc, op) {
  const c = doc.campaigns.find((x) => x.id === op.campaignId);
  return c ? h('span', { class: 'chip chip-campaign', title: 'Campagne' }, c.icon ? `${c.icon} ` : '', c.name) : null;
}

/** Pastilles des canaux (icône + couleur), compactes. */
export function channelDots(doc, op, { max = 4 } = {}) {
  const list = op.channels.map((id) => doc.channels.find((c) => c.id === id)).filter(Boolean);
  if (!list.length) return null;
  return h('span', { class: 'channels', title: list.map((c) => c.label).join(' · ') },
    list.slice(0, max).map((c) => h('span', { class: 'channel-dot', style: { '--ch': c.color } }, c.icon)),
    list.length > max ? h('span', { class: 'channel-more' }, `+${list.length - max}`) : null);
}

export function xpChip(doc, op) {
  if (!isPublished(doc, op)) return null;
  return h('span', { class: 'xp-chip', title: 'XP gagnés' }, `+${xpOf(doc, op)} XP`);
}

export function renderCard(ctx, op) {
  const doc = ctx.doc;
  const late = isLate(op, today());
  const el = h('article', {
    class: 'card glass', tabindex: 0, role: 'button', draggable: ctx.canWrite() ? 'true' : null,
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
      h('div', { class: 'card-sub' }, kindById(op.kind).label, channelDots(doc, op), op.priority === 'p0' || op.priority === 'p1' ? h('span', { class: 'badge badge-soon' }, op.priority === 'p0' ? 'Critique' : 'Haute') : null))),
  progressRow(doc, op),
  h('div', { class: 'card-foot' },
    datePill('Publi', op.dates.publishPlanned, op.dates.publishActual, late.publish),
    verdictBadge(op),
    tasksChip(op),
    campaignChip(doc, op),
    xpChip(doc, op),
    avatar(op.updatedBy, 20)));
  return el;
}
