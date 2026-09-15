import { h, today } from './dom.js';
import { isLate, opDay } from '../model/ops.js';
import { startOfWeek, addDays } from '../model/calendar.js';

export function renderKpis(ctx) {
  const doc = ctx.doc;
  if (!doc) return null;
  const t = today();
  const { finalStageId } = doc.gates;
  const reviewStage = doc.stages.find((s) => s.id === 'review');
  const ops = doc.ops;
  const count = (fn) => ops.filter(fn).length;
  const ws = startOfWeek(t); const we = addDays(ws, 6);
  const isOpen = (o) => o.stageId !== finalStageId;
  const thisWeek = (o) => { const d = opDay(o); return d >= ws && d <= we; };
  const late = count((o) => isLate(o, t));
  const monthStart = `${t.slice(0, 7)}-01`;

  const tile = (key, label, value, sub, color, filter) => h('button', {
    type: 'button', class: `kpi glass kpi-${key}`, 'aria-pressed': ctx.filters.kpi === key ? 'true' : 'false',
    style: { '--kpi': color }, onClick: () => ctx.toggleKpi(key, filter),
  },
  h('span', { class: 'kpi-accent' }),
  h('div', { class: 'kpi-label' }, label),
  h('div', { class: 'kpi-value' }, value),
  sub ? h('div', { class: 'kpi-sub' }, sub) : null);

  return [
    tile('week', 'Cette semaine', count(thisWeek), `${count((o) => thisWeek(o) && !isOpen(o))} publié${count((o) => thisWeek(o) && !isOpen(o)) > 1 ? 's' : ''} · ${count((o) => thisWeek(o) && isOpen(o))} à sortir`, '#22d3ee', { week: true }),
    tile('late', 'En retard', late, late ? 'date de publication dépassée' : 'tout est à l’heure', '#f87171', { late: true }),
    reviewStage ? tile('review', 'À valider', count((o) => o.stageId === reviewStage.id), 'en attente d’un GO', reviewStage.color, { stage: reviewStage.id }) : null,
    tile('unscheduled', 'À planifier', count((o) => isOpen(o) && !o.dates.publishPlanned), 'sans date de publication', '#a78bfa', { unscheduled: true }),
    tile('month', 'Publiés ce mois', count((o) => !isOpen(o) && o.dates.publishActual >= monthStart), `${count((o) => !isOpen(o))} au total`, '#b5f03a', { stage: finalStageId }),
    tile('urgent', 'Urgents', count((o) => o.urgent && isOpen(o)), 'à traiter en priorité', '#fb923c', { urgent: true }),
  ];
}
